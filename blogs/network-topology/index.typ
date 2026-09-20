#import "@local/ypst-template:0.1.0" as theme 

#import theme: template, sidenote, theorem

#show: template
= Network Topology
== Access-Aggregation-Core
#align(center, image("./img1.png", width: 100%))
Firewalls, load balancers, and core switches should all have redundancy; at least two units are required. Access-Aggr-Core design prioritizes #strong[north-sourth traffic] (client-to-server flows).

Internet \<-\-\-\> FW \<-\-\-\> DMZ \<-\-\-\> FW \<-\-\-\> Intranet

== Leaf-Spine
#align(center, image("./img2.png", width: 100%))

Leaf-spine architecture is primarily designed to optimize #strong[east--west traffic] within data center environments. leaf-spine assumes most communication occurs between servers. Every leaf switch connects to all spine switches, creating multiple equal-cost paths between any two endpoints.

For more details, see #link("https://github.com/jay-waves/til/blob/main/net/data-center.md")[til/net/data-center]
