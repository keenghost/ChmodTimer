# ChmodTimer

## Introduction
Change permission or owner of directories and files by timer or create action.


I'm using this for my UNRAID nas, due to some files created by docker containers that can not be wrote with my SMB account. That makes a lot of annoyings when I want to edit files through my Windows PC.

## Docker Usage
```
docker run -d --privileged
  -v your/config.yaml:/chmodtimer/config/config.yaml
  -v path-to-change-permission:/path-in-container
  keenghost/chmodtimer:latest
```
```path-in-container```: depends on config.yaml ```directories```.

## Config
For more usage, see [config-template](config-template.yaml).
