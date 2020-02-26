export const graphs = [
  {
    title:      'global-cluster-cpu-usage',
    unit:       'percent',
    target:     'prometheus_from',
    query:      (duration) => `topk(5,max_over_time((1 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) by (prometheus_from)))[${ duration }:]))`,
    queryRange: (clusterString) => `(1 - (avg(irate(node_cpu_seconds_total{mode="idle", prometheus_from=~"${ clusterString }"}[5m])) by (prometheus_from)))`,
    tooltip:    (metric) => metric.prometheus_from
  },
  {
    title:      'global-cluster-memory-usage',
    unit:       'percent',
    target:     'prometheus_from',
    query:      (duration) => `topk(5,max_over_time((1 - sum(node_memory_MemAvailable_bytes) by (prometheus_from) / sum(node_memory_MemTotal_bytes) by (prometheus_from))[${ duration }:]))`,
    queryRange: (clusterString) => `(1 - sum(node_memory_MemAvailable_bytes{prometheus_from=~"${ clusterString }"}) by (prometheus_from) / sum(node_memory_MemTotal_bytes{prometheus_from=~"${ clusterString }"}) by (prometheus_from))`,
    tooltip:    (metric) => metric.prometheus_from
  },
  {
    title:      'global-cluster-disk-usage',
    unit:       'percent',
    target:     'prometheus_from',
    query:      (duration) => `topk(5,max_over_time(((sum(node_filesystem_size_bytes{device!~"rootfs|HarddiskVolume.+"}) by (prometheus_from) - sum(node_filesystem_free_bytes{device!~"rootfs|HarddiskVolume.+"}) by (prometheus_from)) / sum(node_filesystem_size_bytes{device!~"rootfs|HarddiskVolume.+"}) by (prometheus_from))[${ duration }:]))`,
    queryRange: (clusterString) => `((sum(node_filesystem_size_bytes{device!~"rootfs|HarddiskVolume.+", prometheus_from=~"${ clusterString }"}) by (prometheus_from) - sum(node_filesystem_free_bytes{device!~"rootfs|HarddiskVolume.+", prometheus_from=~"${ clusterString }"}) by (prometheus_from)) / sum(node_filesystem_size_bytes{device!~"rootfs|HarddiskVolume.+", prometheus_from=~"${ clusterString }"}) by (prometheus_from))`,
    tooltip:    (metric) => metric.prometheus_from
  },
  {
    title:      'global-pod-unhealthy',
    unit:       'number',
    target:     'prometheus_from',
    query:      (duration) => `topk(5, max_over_time((sum(kube_pod_status_ready{condition="false"}) by (prometheus_from) - sum(kube_pod_status_phase{phase="Succeeded"}) by (prometheus_from) + sum(kube_pod_status_unschedulable) by (prometheus_from))[${ duration }:]))`,
    queryRange: (clusterString) => `(sum(kube_pod_status_ready{condition="false", prometheus_from=~"${ clusterString }"}) by (prometheus_from) - sum(kube_pod_status_phase{phase="Succeeded", prometheus_from=~"${ clusterString }"}) by (prometheus_from) + sum(kube_pod_status_unschedulable{prometheus_from=~"${ clusterString }"}) by (prometheus_from))`,
    tooltip:    (metric) => metric.prometheus_from
  },
  {
    title:      'global-pod-unschedulable',
    unit:       'number',
    target:     'prometheus_from',
    query:      (duration) => `topk(5,max_over_time((sum(kube_pod_status_scheduled{condition="false"}) by (prometheus_from))[${ duration }:]))`,
    queryRange: (clusterString) => `(sum(kube_pod_status_scheduled{condition="false", prometheus_from=~"${ clusterString }"}) by (prometheus_from))`,
    tooltip:    (metric) => metric.prometheus_from
  },
  {
    title:      'global-pod-restart',
    unit:       'number',
    target:     'prometheus_from',
    query:      (duration) => `topk(5,max_over_time((floor(sum(increase(kube_pod_container_status_restarts_total[5m])) by (prometheus_from)))[${ duration }:]))`,
    queryRange: (clusterString) => `(floor(sum(increase(kube_pod_container_status_restarts_total{prometheus_from=~"${ clusterString }"}[5m])) by (prometheus_from)))`,
    tooltip:    (metric) => metric.prometheus_from
  },
  {
    title:      'global-node-cpu-usage',
    unit:       'percent',
    target:     'node_id',
    query:      (duration) => `topk(5,max_over_time((1 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) by (prometheus_from, node, node_id)))[${ duration }:]))`,
    queryRange: (nodeString) => `(1 - (avg(irate(node_cpu_seconds_total{mode="idle", node_id=~"${ nodeString }"}[5m])) by (prometheus_from, node, node_id)))`,
    tooltip:    (metric) => `${ metric.node } (${ metric.prometheus_from })`
  },
  {
    title:      'global-node-memory-usage',
    unit:       'percent',
    target:     'node_id',
    query:      (duration) => `topk(5,max_over_time((1 - sum(node_memory_MemAvailable_bytes) by (prometheus_from, node, node_id) / sum(node_memory_MemTotal_bytes) by (prometheus_from, node, node_id))[${ duration }:]))`,
    queryRange: (nodeString) => `(1 - sum(node_memory_MemAvailable_bytes{node_id=~"${ nodeString }"}) by (prometheus_from, node, node_id) / sum(node_memory_MemTotal_bytes{node_id=~"${ nodeString }"}) by (prometheus_from, node, node_id))`,
    tooltip:    (metric) => `${ metric.node } (${ metric.prometheus_from })`
  },
  {
    title:      'global-node-disk-usage',
    unit:       'percent',
    target:     'node_id',
    query:      (duration) => `topk(5,max_over_time(((sum(node_filesystem_size_bytes{device!~"rootfs|HarddiskVolume.+"}) by (prometheus_from, node, node_id) - sum(node_filesystem_free_bytes{device!~"rootfs|HarddiskVolume.+"}) by (prometheus_from, node, node_id)) / sum(node_filesystem_size_bytes{device!~"rootfs|HarddiskVolume.+"}) by (prometheus_from, node, node_id))[${ duration }:]))`,
    queryRange: (nodeString) => `((sum(node_filesystem_size_bytes{device!~"rootfs|HarddiskVolume.+", node_id=~"${ nodeString }"}) by (prometheus_from, node, node_id) - sum(node_filesystem_free_bytes{device!~"rootfs|HarddiskVolume.+", node_id=~"${ nodeString }"}) by (prometheus_from, node, node_id)) / sum(node_filesystem_size_bytes{device!~"rootfs|HarddiskVolume.+", node_id=~"${ nodeString }"}) by (prometheus_from, node, node_id))`,
    tooltip:    (metric) => `${ metric.node } (${ metric.prometheus_from })`
  },
  {
    title:      'global-pod-cpu-usage',
    unit:       'mcpu',
    target:     'pod_id',
    query:      (duration) => `topk(5,max_over_time(rate(container_cpu_usage_seconds_total{container="", pod!=""}[5m])[${ duration }:]))`,
    queryRange: (podIdString) => `rate(container_cpu_usage_seconds_total{pod_id=~"${ podIdString }", container="", pod!=""}[5m])`,
    tooltip:    (metric) => `${ metric.pod } (${ metric.prometheus_from }) (${ metric.namespace })`
  },
  {
    title:      'global-pod-memory-usage',
    unit:       'byte',
    target:     'pod_id',
    query:      (duration) => `topk(5,max_over_time(container_memory_working_set_bytes{container="", pod!=""}[${ duration }]))`,
    queryRange: (podIdString) => `container_memory_working_set_bytes{container="",pod_id=~"${ podIdString }"}`,
    tooltip:    (metric) => `${ metric.pod } (${ metric.prometheus_from }) (${ metric.namespace })`
  },
];

export default { graphs }
