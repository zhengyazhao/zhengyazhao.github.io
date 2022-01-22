# centos 安装nginx

1. 下载nginx 安装包

````
  wget http://nginx.org/download/nginx-1.18.0.tar.gz
````

2. 安装所需配置文件

````
yum install -y  gcc-c++ pcre pcre-devel zlib zlib-devel openssl openssl-devel
````

3. 创建一个文件夹,执行configure命令会用到

````
mkdir /usr/local/apps
mkdir -p /var/temp/nginx
````

4. 解压nginx 安装包,**/usr/local/apps**为解压路径

````
Tar -zxvf nginx-1.18.0.tar.gz -C /usr/local/apps
````

5. 进入nginx 目录

````
Cd nginx-1.18.0
````

6. 执行configure命令

```` 
		./configure \
		--prefix=/usr/local/nginx \
		--pid-path=/var/run/nginx/nginx.pid \
		--lock-path=/var/lock/nginx.lock \
		--error-log-path=/var/log/nginx/error.log \
		--http-log-path=/var/log/nginx/access.log \
		--with-http_gzip_static_module \
		--http-client-body-temp-path=/var/temp/nginx/client \
		--http-proxy-temp-path=/var/temp/nginx/proxy \
		--http-fastcgi-temp-path=/var/temp/nginx/fastcgi \
		--http-uwsgi-temp-path=/var/temp/nginx/uwsgi \
--http-scgi-temp-path=/var/temp/nginx/scgi
````

7. 安装和编译

````
make & make install
````

8. 指定目录

```` 
sudo /usr/local/nginx/sbin/nginx -c /usr/local/nginx/conf/nginx.conf
````





## 环境变量配置

* 打开环境变量设置

  * vim /etc/profile

* 输入以下内容

  * NGINX_HOME=/usr/local/nginx

    export PATH=${NGINX_HOME}/sbin:${PATH}

* 重启生效

  * source /etc/profile



