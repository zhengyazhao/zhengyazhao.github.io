---
layout: post
title: 配置ingressController
date: 2022/02/17 17:50
category:  k8s
---



# 简介

&emsp;&emsp;ingress简单来说就是一个负载均衡，因为pod是动态分配在不同的node节点上，如果是手动配置的话，无法确定ip地址，并且如果是新增节点工作量较大，所以客户端先请求ingress转发到service然后再到最终的pod<br/>



## 安装ingressController

&emsp;&emsp;从github[下载](https://github.com/kubernetes/ingress-nginx/blob/main/deploy/static/provider/cloud/deploy.yaml)deploy.yaml文件，需要把其中获取镜像的地址改为国内的地址,不然容易获取不到镜像<br/>



````
1.ingress-nginx-controller的image地址改为:
  registry.cn-hangzhou.aliyuncs.com/google_containers/nginx-ingress-controller:v1.1.1
2.ingress-nginx-admission-create的image地址改为:
  registry.cn-hangzhou.aliyuncs.com/google_containers/kube-webhook-certgen:v1.1.1
````



&emsp;&emsp;上述操作完成之后需要把控制器的类型deploment改为daemonSet

````yaml
apiVersion: apps/v1
#kind: Deployment
kind: DaemonSet
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/managed-by: Helm
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: ingress-nginx
    app.kubernetes.io/version: 1.1.1
    helm.sh/chart: ingress-nginx-4.0.16
  name: ingress-nginx-controller
  namespace: ingress-nginx
````



&emsp;&emsp;添加hostNetwork<br/>

````yaml
      dnsPolicy: ClusterFirst
      nodeSelector:
        kubernetes.io/os: linux
      serviceAccountName: ingress-nginx
      hostNetwork: true  ## 后期自动添加
      terminationGracePeriodSeconds: 300

````

&emsp;&emsp;之后运行**kubectl apply -f deploy.yaml**文件运行即可,运行效果如下:<br/>

![image-20220217122400624](/images/image-20220217122400624.png)



## 添加ingress

&emsp;&emsp;执行如下文件即可通过外网访问到nginx 应用，前提记得80端口不要被其他应用占用。<br/>



````yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  namespace: dev
  name: exam-dev
  labels:
    app: exam-dev
spec:
  replicas: 1
  selector:
    matchLabels:
      app: exam-dev
  template:
    metadata:
      namespace: dev
      labels:
        app: exam-dev
    spec:
      containers:
      - name: nginx
        image: nginx:1.14.2
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  namespace: dev
  name: exam-dev
spec:
  selector:
    app: exam-dev
  ports:
  - port: 31102
    targetPort: 80
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  namespace: dev
  name: exam-ingress
  annotations:
    kubernetes.io/ingress.class: "nginx"
spec:
  rules:
  - host: k8stest.test.com
    http:
      paths:
      - pathType: Prefix
        path: /
        backend:
          service:
            name: exam-dev
            port:
              number: 31102 # 服务端口号

````

