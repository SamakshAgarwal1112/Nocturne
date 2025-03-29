# Command to run
# docker run --privileged \
#            --device /dev/video0 \
#            --device /dev/snd:/dev/snd \
#            -e DISPLAY=$DISPLAY \
#            -v /tmp/.X11-unix:/tmp/.X11-unix \
#            -e PULSE_SERVER=unix:/run/user/1000/pulse/native \
#            -v /run/user/1000/pulse:/run/user/1000/pulse \
#            --name nocturne_container nocturne