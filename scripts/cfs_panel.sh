#!/bin/sh

set -e

# Creality CFS Panel — web dashboard (style of CrealityPrint "Device" page) for
# rooted K1/K1C/K1 Max. Reads the CFS + telemetry over the Creality WS:9999 and
# is served by the Helper Script's Nginx on port 4410 (next to Fluidd/Mainsail).
# Source: https://github.com/sandman21vs/creality-cfs-panel

CFS_PANEL_MARK_BEGIN="    # >>> creality-cfs-panel >>>"
CFS_PANEL_MARK_END="    # <<< creality-cfs-panel <<<"

function cfs_panel_message() {
  top_line
  title 'Creality CFS Panel' "${yellow}"
  inner_line
  hr
  echo -e " │ ${cyan}Web dashboard (CrealityPrint style) for the CFS and device.  ${white}│"
  echo -e " │ ${cyan}Slots, color, product, %, humidity/temp, camera, controls    ${white}│"
  echo -e " │ ${cyan}over the Creality WS:9999.                                    ${white}│"
  echo -e " │ ${cyan}It will be accessible on port ${CFS_PANEL_PORT}.                          ${white}│"
  hr
  bottom_line
}

# Escape a literal string for use as a sed regex address.
function _cfs_sed_esc() { printf '%s' "$1" | sed 's/[][\\.*^$/]/\\&/g'; }

function _cfs_panel_remove_nginx() {
  [ -f "$NGINX_MAIN_CONF" ] || return 0
  if grep -qF "$CFS_PANEL_MARK_BEGIN" "$NGINX_MAIN_CONF"; then
    sed -i "/$(_cfs_sed_esc "$CFS_PANEL_MARK_BEGIN")/,/$(_cfs_sed_esc "$CFS_PANEL_MARK_END")/d" "$NGINX_MAIN_CONF"
  fi
}

function _cfs_panel_inject_nginx() {
  _cfs_panel_remove_nginx
  local block="${CFS_PANEL_MARK_BEGIN}
    server {
        listen ${CFS_PANEL_PORT} default_server;
        access_log off;
        error_log off;
        gzip on;
        gzip_types text/plain text/css application/javascript application/json;
        root ${CFS_PANEL_FOLDER};
        index index.html;
        server_name _;
        location / {
            try_files \$uri \$uri/ /index.html;
        }
        location = /index.html {
            add_header Cache-Control \"no-store, no-cache, must-revalidate\";
        }
        location /gcodeimg/ {
            alias /tmp/creality/local_gcode/;
            access_log off;
            expires 1h;
        }
    }
${CFS_PANEL_MARK_END}"
  awk -v block="$block" '
    !done && /^[[:space:]]*http[[:space:]]*\{/ { print; print block; done=1; next }
    { print }
  ' "$NGINX_MAIN_CONF" > "$NGINX_MAIN_CONF.tmp" && mv "$NGINX_MAIN_CONF.tmp" "$NGINX_MAIN_CONF"
}

function install_cfs_panel() {
  cfs_panel_message
  local yn
  while true; do
    install_msg "Creality CFS Panel" yn
    case "${yn}" in
      Y|y)
        echo -e "${white}"
        if [ ! -f "$NGINX_MAIN_CONF" ]; then
          error_msg "Nginx configuration not found, please install Moonraker and Nginx first!"
          return
        fi
        echo -e "Info: Copying panel files..."
        rm -rf "$CFS_PANEL_FOLDER"
        mkdir -p "$CFS_PANEL_FOLDER"
        cp -a "$CFS_PANEL_SRC"/. "$CFS_PANEL_FOLDER"/
        echo -e "Info: Setting permissions (Nginx worker runs as www-data)..."
        chmod -R a+rX "$CFS_PANEL_FOLDER"
        echo -e "Info: Configuring Nginx (port ${CFS_PANEL_PORT})..."
        _cfs_panel_inject_nginx
        echo -e "Info: Restarting Nginx service..."
        restart_nginx
        ok_msg "Creality CFS Panel has been installed successfully!"
        echo -e "   You can now connect to it with ${yellow}http://$(check_ipaddress):${CFS_PANEL_PORT}${white}"
        return;;
      N|n)
        error_msg "Installation canceled!"
        return;;
      *)
        error_msg "Please select a correct choice!";;
    esac
  done
}

function remove_cfs_panel() {
  cfs_panel_message
  local yn
  while true; do
    remove_msg "Creality CFS Panel" yn
    case "${yn}" in
      Y|y)
        echo -e "${white}"
        echo -e "Info: Removing Nginx configuration..."
        _cfs_panel_remove_nginx
        echo -e "Info: Removing files..."
        rm -rf "$CFS_PANEL_FOLDER"
        echo -e "Info: Restarting Nginx service..."
        restart_nginx
        ok_msg "Creality CFS Panel has been removed successfully!"
        return;;
      N|n)
        error_msg "Deletion canceled!"
        return;;
      *)
        error_msg "Please select a correct choice!";;
    esac
  done
}
