---
layout: post
title: centos 安装docker-compose
date: 2022/01/20 17:50
category:  linux
---

## 获取二进制

````
sudo curl -L https://github.com/docker/compose/releases/download/1.24.1/docker-compose-`uname -s`-`uname -m` -o /usr/local/bin/docker-compose
````

## 设置权限

````
sudo chmod +x /usr/local/bin/docker-compose
````

