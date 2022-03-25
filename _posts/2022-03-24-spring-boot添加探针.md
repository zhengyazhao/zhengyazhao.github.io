---
layout: post
title: spring-boot添加探针
date: 2022/03/24 15:04
category:  linux
---



# 环境

* spring-boot
* skywalking-agent 8.7.0



## 1.下载skywalking安装包

从skywalking[官网下载安装包](https://archive.apache.org/dist/skywalking/8.7.0/apache-skywalking-apm-es7-8.7.0.tar.gz)，下载完安装包之后里面在java的运行参数添加运行参数:<br/>

````
-javaagent:F:/tools/test/apache-skywalking-apm-bin-es7/agent/skywalking-agent.jar
````



添加环境变量，之后运行即可<br/>

````
SW_AGENT_NAME=thesis;SW_AGENT_COLLECTOR_BACKEND_SERVICES=39.105.139.93:11800

# SW_AGENT_NAME 服务名称
# SW_AGENT_COLLECTOR_BACKEND_SERVICES oap服务地址
# 11800 rpc端口号
````



配置完成之后的图片如下:<br>

![config](/images/skywalking/config.png)







# logback日志集成到skywalking中展示

&emsp;&emsp;在skywalking8.4.0以上的版本当中支持展示日志，所以把日志内容也集成到skywalking当中了。<br/>

&emsp;&emsp;在pom当中添加引用。<br/>

````xml
  <!--skywalking-->
        <dependency>
            <groupId>org.apache.skywalking</groupId>
            <artifactId>apm-toolkit-logback-1.x</artifactId>
            <version>8.7.0</version>
        </dependency>


   <root level="info">
        <appender-ref ref="gpc-log"/>
    </root>
````



在logback-spring.xml文件中添加appender,其他的配置可以参照该[地址](https://skywalking.apache.org/docs/skywalking-java/latest/en/setup/service-agent/java-agent/application-toolkit-logback-1.x/)<br/>

````
    <appender name="gpc-log" class="org.apache.skywalking.apm.toolkit.log.logback.v1.x.log.GRPCLogClientAppender">
        <encoder class="ch.qos.logback.core.encoder.LayoutWrappingEncoder">
            <layout class="org.apache.skywalking.apm.toolkit.log.logback.v1.x.mdc.TraceIdMDCPatternLogbackLayout">
                <Pattern>${log.pattern2}</Pattern>
            </layout>
        </encoder>
    </appender>
````



并且需要在你下载的skywalking文件当中找到**/agent/config/agent.conf**，在文件的末尾添加如下配置:<br/>

```
plugin.toolkit.log.grpc.reporter.server_host=192.168.1.1  //地址
plugin.toolkit.log.grpc.reporter.server_port=11800   //rpc端口号
plugin.toolkit.log.grpc.reporter.max_message_size=10485760 //日志数据最大大小
plugin.toolkit.log.grpc.reporter.upstream_timeout=30   //客户端向上游发送数据时时间，单位秒
```

![config](/images/skywalking/xiaoguo.png)