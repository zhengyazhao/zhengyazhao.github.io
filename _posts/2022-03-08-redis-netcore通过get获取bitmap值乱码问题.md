---
layout: post
title: netcore通过get获取bitmap值乱码问题
date: 2022/03/08 17:50
category:  redis
---




# netcore 通过get获取bitmap值乱码问题

&emsp;&emsp;业务场景是需要记录学生听课记录时间精确到秒，在讨论过程中采用了redis的bitmap存储学员听课记录。利用bitmap的结构存储学员的听课记录，例如一个视频的大小为1小时，拆解下来就是60分钟，拆成秒的话是3600秒，对应创建一个长度为3600的bitmap结构存储听课记录，客户端时时上报。并且也能检测到学员哪一秒看了<br/>





### 问题描述

&emsp;&emsp;问题是在持久化学员听课记录的时候，如果是获取bitmap结构的话，无法获取到整体结构,导致无法持久化到数据库当中。

redis中通过get获取bitmap的话，redis将二进制数据打包成16进制返回。



### 排查过程

 &emsp; &emsp;首次排查的时候先在redis当中添加bitmap,设置第0位为1.

````
setbit test 0 1
````

由于redis当中保存的时候，格式跟普通的数组不一样，采用的是逆序数组，所以设置第0位是1的时候，实际上结果是如下图:

|      |      |      |      |      |      |      |      |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| 1    | 0    | 0    | 0    | 0    | 0    | 0    | 0    |



&emsp;&emsp;在用get获取的时候结果显示如下，<br/>

````
localhost:6379> get test
 "\x80"
````

&emsp;&emsp;从代码中获取出来的数据,显示的就是一个乱码<br/>

````c#

		[Test]
        public void test1()
        {
            string key="test"; 
            RedisClient cli = new RedisClient("localhost:6379"); 
            
            var value=cli.get(key);
            
            cli.set(key,value);
        }

//上述方法运行输出的结果是个 ♠也就是乱码。
````

然后再看redis当中此时**test**的值。<br/>

````
localhost:6379> get test
 "\xef\xbf\xbd"
````



# 解决办法

&emsp;&emsp;从github当中下载了 [csredis](https://github.com/2881099/csredis) 查看源码,发现其中有这个么方法.<br/>

````
  public string ReadBulkString(bool checkType = true)
        {
            byte[] bulk = ReadBulkBytes(checkType);
            if (bulk == null)
                return null;
            return _io.Encoding.GetString(bulk);// 这行代码。
        }
````

&emsp;&emsp;随即想到16进制的0x80的10进制是128，128转换为unicode无法转换，由于unicode编码1字节最多表示127，这里出来个1字节的128，导致转换失败。

解决办法是替换成了exchangestackredis，即可获取到值.



````
    ConnectionMultiplexer _conn = ConnectionMultiplexer.Connect("localhost:6379,connectTimeout=2000");
        var test= _conn.GetDatabase().StringGet("test");
            System.Console.WriteLine(test.HasValue);
            object value = test.Box();
````





