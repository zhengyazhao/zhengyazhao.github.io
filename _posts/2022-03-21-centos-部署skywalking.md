---
layout: post
title: centos 部署skywalking
date: 2022/03/21 17:50
category:  linux
---


# 简介

&emsp;&emsp;在分布式系统当中,想要监控服务与服务之间调用耗时,或者是查问题的时候,不能像向单机那种形式去查询.查找了一段时间发现目前市场上用的是skywalking,由华为大佬开源的项目。<br/>

摘自skywalking简介:一个开放源代码的可观察性平台，用于**收集，分析，聚合和可视化来自服务**和**云本机基础结构的数据**<br/>
&emsp;&emsp;SkyWalking为服务，服务实例，端点提供可观察性功能。服务，实例和端点这两个术语在今天到处都有使用，因此值得在SkyWalking的上下文中定义它们的特定含义<br/>

- **服务**:表示一组/一组工作负载，这些工作负载为传入请求提供相同的行为。您可以在使用乐器代理或SDK时定义服务名称。SkyWalking也可以使用您在Istio等平台中定义的名称。<br/>
- **服务实例**：服务组中的每个单独工作负载都称为实例。像pods在Kubernetes中一样，它不必是单个OS进程，但是，如果您使用仪器代理，则实例实际上是一个真正的OS进程。<br/>
- **端点**：服务中用于传入请求的路径，例如HTTP URI路径或gRPC服务类+方法签名。<br/>


&emsp;&emsp;skywalking数据存储**默认提供了H2内存存储**,除此之外还支持如下几种<br/>


- h2
- ElasticSearch 7
- MySQL
- TiDB
- InfluxDB


## 下载安装elasticSearch
&emsp;&emsp;首先找到es的镜像,在获取镜像的时候**必须**输入版本号<br/>

    docker pull elasticsearch:7.12.0

&emsp;&emsp;通过镜像启动一个容器,并将**9200和9300**端口映射到本机。<br/>

    docker run -tid --name es --network localnet -p 9200:9200 -p 9300:9300 --restart always elasticsearch:7.7.0




# 安装skywalking
&emsp;&emsp;以下基于docker安装skywalking,先查找skywalking镜像,pull下来这两个镜像,一个是**skywalking服务**,**一个是ui显示**<br/>

    docker pull apache/skywalking-oap-server:8.7.0-es7
    
    docker pull apache/skywalking-ui




## 运行skywalking-oap-server
&emsp;&emsp;通过镜像启动skywalking服务镜像,此处一定要注意**配置时区**不然会出问题。<br/>

    docker run -tid -p 1234:1234 -p 11800:11800 -p 12800:12800 --name oap --restart always -e SW_STORAGE=elasticsearch7 -e SW_STORAGE_ES_CLUSTER_NODES=172.24.194.195:9200 --mount type=volume,source=oap_config,target=/skywalking/config  -e TZ=Asia/Shanghai   apache/skywalking-oap-server:8.7.0-es7
    


## 运行skywalking-ui
     docker run --name skywalking-ui -tid -p 8121:8080  --network localnet -e TZ=Asia/Shanghai  -e SW_OAP_ADDRESS=skywalking:12800 --restart always apache/skywalking-ui --security.user.admin.password=admin

