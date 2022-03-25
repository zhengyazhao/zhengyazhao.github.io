---
layout: post
title: netcore添加skywalking-apm探针
date: 2022/03/24 15:04
category:  linux
---



# netcore添加skywalking

&emsp;&emsp;新建netcore(skywalking apm 仅支持netcore3.1 以上版本)项目,找到项目文件路径中的**Properties/kaybcgSettings.json** <br/>

````json
{
  "$schema": "http://json.schemastore.org/launchsettings.json",
  "iisSettings": {
    "windowsAuthentication": false,
    "anonymousAuthentication": true,
    "iisExpress": {
      "applicationUrl": "http://localhost:57258",
      "sslPort": 0
    }
  },
  "profiles": {
    "IIS Express": {
      "commandName": "IISExpress",
      "launchBrowser": true,
      "launchUrl": "swagger",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    },
    "test": {
      "commandName": "Project",
      "launchBrowser": true,
      "launchUrl": "swagger",
      "applicationUrl": "http://localhost:6100",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development",
        "ASPNETCORE_HOSTINGSTARTUPASSEMBLIES": "SkyAPM.Agent.AspNetCore",  # 添加探针
        "SKYWALKING__SERVICENAME": "usermanagement"  # 服务名称
      }
    }
  }
}

````



在nuget搜索如下安装包**skyAPM.agent.AspnetCore、**安装。

&emsp;&emsp;在项目目录上添加**skywalking.json**或者在命令行采用**dotnet skyapm config 程序名 192.168.0.1:11800**自动生成.<br/>

````json
{
  "SkyWalking": {
    "ServiceName": "usermanagement",# 程序名
    "Namespace": "",
    "HeaderVersions": [
      "sw8"
    ],
    "Sampling": {
      "SamplePer3Secs": -1,
      "Percentage": -1.0
    },
    "Logging": {
      "Level": "Information",
      "FilePath": "logs\\skyapm-{Date}.log"
    },
    "Transport": {
      "Interval": 3000,
      "ProtocolVersion": "v8",
      "QueueSize": 30000,
      "BatchSize": 3000,
      "gRPC": {
        "Servers": "192.168.0.1:11800",
        "Timeout": 10000,
        "ConnectTimeout": 10000,
        "ReportTimeout": 600000,
        "Authentication": ""
      }
    }
  }
}
````

上述配置之后，直接运行程序即可