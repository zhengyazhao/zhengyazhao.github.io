---

layout: post
title: centos 安装postgresql
date: 2022/01/25 17:50
category:  OP
---



# 单机安装

### 下载rpm包

&emsp;&emsp;可以选择其他方式下载安装包，本次安装采用的是rpm包安装。<br/>

````
sudo yum install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-7-x86_64/pgdg-redhat-repo-latest.noarch.rpm
````

### 安装pgsql

````
yum install postgresql10 -y  
yum install -y postgresql10-server
systemctl restart postgresql-10  
````

### 设置自动启动

````
sudo /usr/pgsql-10/bin/postgresql-10-setup initdb
sudo systemctl enable postgresql-10
sudo systemctl start postgresql-10
````

### 修改密码

````
//登录
sudo -u postgres psql
//修改密码
ALTER USER postgres WITH PASSWORD 'postgres';
````

### 修改端口号和监听地址

````
listen_addresses ='*'

port= 5432
max_connections = 100
````

### 配置访问权限

&emsp;&emsp;sudo vim /var/lib/pgsql/data/pg_hba.conf<br/>

```
local   all  all  all   trust
```

