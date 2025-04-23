## Autostart Backend (FastAPI)
Let’s run FastAPI using systemd (the Linux boot-time service manager).

### Create a systemd service
`sudo nano /etc/systemd/system/backend.service`

### Paste this:
[Unit]
Description=FastAPI backend for Drowsiness System
After=network.target

[Service]
WorkingDirectory=/home/pi/EDP/Drowsiness_detection_project/nocturne_backend
ExecStart=/usr/bin/python3 main.py
Restart=always
User=pi
Environment="PATH=/usr/bin"

[Install]
WantedBy=multi-user.target
Replace WorkingDirectory with your backend folder path, and make sure main.py is correct.

### Enable and start:
`sudo systemctl daemon-reexec`
`sudo systemctl daemon-reload`
`sudo systemctl enable backend.service`
`sudo systemctl start backend.service`

## Autostart Frontend in Kiosk Mode

### Step 1: Build React App (once)
`cd /home/pi/EDP/Drowsiness_detection_project/nocturne_frontend`
`npm run build`
`npm install -g serve`

### Step 2: Autostart Chromium to show dashboard
Edit this file:
`nano ~/.config/lxsession/LXDE-pi/autostart`
At the bottom, add:
`@chromium-browser --noerrdialogs --kiosk http://localhost:5173`

### Step 3: Autostart React App server
Add this to ~/.bashrc at the very end:
`serve -s /home/pi/nocturne/frontend/dist -l 5173 &`



## For allowing pi user to shutdown/reboot without password.

### Run:
`sudo visudo`

### Add this line at the bottom:
`pi ALL=(ALL) NOPASSWD: /sbin/shutdown, /sbin/reboot`