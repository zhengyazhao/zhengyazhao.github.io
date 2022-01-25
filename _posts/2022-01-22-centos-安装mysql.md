````
layout: post
title: centos 安装mysql
date: 2022/01/25 17:50
category:  OP
````



## 下载安装包

 ````
   wget -i -c http://dev.mysql.com/get/mysql57-community-release-el7-10.noarch.rpm
 ````

## 安装mysql包

 ````
  yum -y install mysql57-community-release-el7-10.noarch.rpm
 ````



## 安装mysql

  ````
    yum -y install mysql-community-server
  ````

## 启用mysql

````
  sudo service mysqld start
````

## 查看临时密码

 ````
   sudo grep 'temporary password' /var/log/mysqld.log
 ````

## 进入mysql

````
   mysql -u root -p
````

## 修改密码

 ````
  ALTER USER 'root'@'localhost' IDENTIFIED BY 'Yswx123456!';
 ````

## 修改远程登陆

 ````
   GRANT ALL PRIVILEGES on *.* to 'root'@'%' identified by 'Yswx123456!';
 ````



## 刷新

````
  flush privileges;
````



