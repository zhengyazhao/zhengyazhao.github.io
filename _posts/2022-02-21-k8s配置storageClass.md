---
layout: post
title: 配置storageClass
date: 2022/02/21 17:50
category:  k8s 
---

#  简介

&emsp;&emsp;持久化配置如果是采用pvc的话，需要手动匹配pv，这种场景的话在服务比较多的话，创建起来比较麻烦，所以采用了动态数据卷的形式。



# 配置nfs服务器



````
1.yum -y install nfs-utils  
2.vim /etc/exports
   2.1 /data *(rw,sync,no_root_squash)
3.mkdir /data
4.systemctl start rpcbind
5. systemctl enable rpcbind
6.systemctl start nfs
7.systemctl enable nfs-server
8.showmount -e  服务器ip
````



# 基础配置



&emsp;&emsp;1.23版本需要先配置k8s-apiserver当中添加如下命令<br/>

````
vim /etc/kubernetes/manifests/kube-apiserver.yaml 
添加如下命令
- --feature-gates=RemoveSelfLink=false
# 应用配置
kubectl apply -f /etc/kubernetes/manifests/kube-apiserver.yaml
````



### 创建rbac权限

&emsp;&emsp;用户通过角色与权限进行关联,是从认证-》授权-》准入机制。<br/>

````yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: nfs-provisioner
  namespace: default
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: nfs-provisioner-runner
  namespace: default
rules:
   -  apiGroups: [""]
      resources: ["persistentvolumes"]
      verbs: ["get", "list", "watch", "create", "delete"]
   -  apiGroups: [""]
      resources: ["persistentvolumeclaims"]
      verbs: ["get", "list", "watch", "update"]
   -  apiGroups: ["storage.k8s.io"]
      resources: ["storageclasses"]
      verbs: ["get", "list", "watch"]
   -  apiGroups: [""]
      resources: ["events"]
      verbs: ["watch", "create", "update", "patch"]
   -  apiGroups: [""]
      resources: ["services", "endpoints"]
      verbs: ["get","create","list", "watch","update"]
   -  apiGroups: ["extensions"]
      resources: ["podsecuritypolicies"]
      resourceNames: ["nfs-provisioner"]
      verbs: ["use"]
---
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: run-nfs-provisioner
subjects:
  - kind: ServiceAccount
    name: nfs-provisioner
    namespace: default
roleRef:
  kind: ClusterRole
  name: nfs-provisioner-runner
  apiGroup: rbac.authorization.k8s.io
````



&emsp;&emsp;编写好文件之后，执行文件进行创建。<br/>

````
kubectl apply -f rbac-rolebind.yaml


````

创建一个nfs的deployment:**nfs-deployment.yaml**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nfs-client-provisioner
#  namespace: default
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: nfs-client-provisioner
  template:
    metadata:
      labels:
        app: nfs-client-provisioner
    spec:
      serviceAccount: nfs-provisioner
      containers:
        - name: nfs-client-provisioner
          image: registry.cn-hangzhou.aliyuncs.com/jun-lin/nfs:client-provisioner
          volumeMounts:
            - name: nfs-client-root
              mountPath:  /persistentvolumes
          env:
            - name: PROVISIONER_NAME
              value: nfs-deploy    #供给方的名称
            - name: NFS_SERVER
              value: 192.168.1.1  #nfs服务器IP
            - name: NFS_PATH
              value: /data    #nfs共享目录
      volumes:
        - name: nfs-client-rodataot
          nfs:
            server: 192.168.11.1  #nfs服务器IP
            path: /data  #nfs共享目录
```

&emsp;&emsp;执行nfs-deployment.yaml

````
kubectl apply -f nfs-deployment.yaml

# 查看是否正常运行
kubectl get po
````



&emsp;&emsp;创建storage class:**nfs-sc.yaml**<br/>

````yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: statefu-nfs
  namespace: default
provisioner: nfs-deploy     #这里的名字要和上面deploy定义的PROVISIONER_NAME一样
reclaimPolicy: Retain
````



&emsp;&emsp;创建一个pvc看pv是否会自动创建**test-pvc.yaml**

````yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-claim
  namespace: default
spec:
  storageClassName: statefu-nfs   #sc一定要指向上面创建的sc名称
  accessModes:
    - ReadWriteMany   #采用ReadWriteMany的访问模式
  resources:
    requests:
      storage: 1Gi
````





# 项目中使用



创建pod文件：**strageClass.yaml**，镜像由自己生成。



````yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: netcoretest-log
  labels:
    app: netcoretest-log
spec:
  replicas: 1
  selector:
    matchLabels:
      app: netcoretest-log
  template:
    metadata:
      name: k8s-logs
      labels:
        app: netcoretest-log
    spec:
      nodeSelector:
        type: node1
      containers:
      - image: k8stest:3.0
        name: netcoretest
        volumeMounts:
        - name: netcore-log
          mountPath: /app/logs
        ports:
        - containerPort: 5001
      volumes:
      - name: netcore-log
        persistentVolumeClaim:
          claimName: test-claim

---
apiVersion: v1
kind: Service
metadata:
  name: test-log
spec:
  type: NodePort
  ports:
  - port: 8088
    targetPort: 5001
    nodePort: 31111
  selector:
    app: netcoretest-log

````

 &emsp; &emsp;使用命令访问，并且可成功响应<br/>

````
curl http://localhost:31111/users

````



# 问题

&emsp;&emsp;在部署过程中，记得所有依赖镜像改成国内镜像，很多个部署相关的问题都是由于镜像问题无法部署。

在部署过程中，要记得多使用命令观察程序运行的结果。

````
kubectl describe po  pod名称   //查看pod的运行详情
kubectl logs  pod名称   //多查看日志
````

