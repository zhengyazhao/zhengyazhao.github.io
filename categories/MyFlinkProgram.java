package flinktest;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.ververica.cdc.connectors.sqlserver.SqlServerSource;
import com.ververica.cdc.debezium.DebeziumDeserializationSchema;
import com.ververica.cdc.debezium.JsonDebeziumDeserializationSchema;
import io.debezium.data.Envelope;
import org.apache.calcite.rel.core.RelFactories;
import org.apache.flink.api.common.RuntimeExecutionMode;
import org.apache.flink.api.common.functions.FilterFunction;
import org.apache.flink.api.common.functions.MapFunction;
import org.apache.flink.api.common.functions.RuntimeContext;
import org.apache.flink.api.common.typeinfo.TypeInformation;
import org.apache.flink.connector.elasticsearch.sink.RequestIndexer;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.datastream.DataStreamSource;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.source.SourceFunction;
import org.apache.flink.streaming.connectors.elasticsearch7.ElasticsearchSink;
import org.apache.flink.util.Collector;
import org.apache.http.HttpHost;
import org.apache.kafka.common.protocol.types.Struct;
import org.apache.kafka.connect.json.JsonConverterConfig;
import org.apache.kafka.connect.source.SourceRecord;
import org.elasticsearch.client.Requests;

import java.util.*;

public class MyFlinkProgram {
    public static void main(String[] args) throws Exception {

// 创建一个 Flink 程序执行环境,并且设置并行度
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        env.setParallelism(4);

        //设置执行模式
   /*     env.setRuntimeMode(RuntimeExecutionMode.BATCH);*/

        // 指定数据源
        SourceFunction<String> sourceFunction = SqlServerSource.<String>builder()
                .hostname("localhost")
                .port(1433)
                .database("test")
                .tableList("dbo.sys_fun")
                .username("sa")
                .password("111111")
                .deserializer(new JsonDebeziumDeserializationSchema())
                .build();

        // 流式并行数据源
        DataStreamSource<String> stream = env.addSource(sourceFunction);


        DataStream<String> filterSource= stream.filter((FilterFunction<String>) s -> {
            try {
                //判断是否是json格式，不是过滤掉
                JSONObject obj = JSON.parseObject(s);
                return true;
            } catch (Exception e) {
                System.out.println("json格式错误："+ s) ;
                return  false;
            }
        });






    /*        *
         * 创建一个ElasticSearchSink对象*/

/*        List<HttpHost> httpHosts = new ArrayList<>();
        httpHosts.add(new HttpHost("localhost", 9200, "http"));

        ElasticsearchSink.Builder<JSONObject> esSinkBuilder = new ElasticsearchSink.Builder<JSONObject>(
                httpHosts,
                new ElasticsearchSinkFunction<JSONObject>() {
                    @Override
                    public void process(JSONObject customer, RuntimeContext ctx, RequestIndexer indexer) {
                        // 数据保存在Elasticsearch中名称为index_customer的索引中，保存的类型名称为type_customer
                        indexer.add(Requests.indexRequest().index("index_customer").type("type_customer").id(String.valueOf(customer.getLong("id"))).source(customer));
                    }
                }
        );

                esSinkBuilder.setBulkFlushMaxActions(50);*/

     /*   *
         * 把转换后的数据写入到ElasticSearch中*/
/*
        transSource.addSink(esSinkBuilder.build());*/



        stream.print();


        env.execute();// 执行
    }


}
