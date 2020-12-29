# Hypergraph Rewriting System

https://met4citizen.github.io/Hypergraph/

The app uses [3d Force-Directed Graph](https://github.com/vasturiano/3d-force-graph) for
representing graph structures, [ThreeJS](https://github.com/mrdoob/three.js/)/WebGL for
3D rendering and [d3-force-3d](https://github.com/vasturiano/d3-force-3d) for the
physics engine.

For more information about hypergraph rewriting systems and their potential to
represent fundamental physics see [The Wolfram Physics Project](https://www.wolframphysics.org)
website and [technical documents](https://www.wolframphysics.org/technical-documents/).

## Rules

Change the rewriting rule and related settings by clicking `RULE`.
Settings include different rule and event orderings and the
max number of rewriting events. Start the rewriting process by clicking `RUN`. 

An example of a hypergraph rewriting rule:

```
(1,1,2)(2,3,4)->(1,5,4)(2,5,3)(5,5,4)
(1,1,1)(1,1,1)
```

Wherever the left-hand side pattern `(1,1,2)(2,3,4)` is
found on the hypergraph, it is replaced with the  right-hand
side pattern `(1,5,4)(2,5,3)(5,5,4)`. The two sides must be
separated with an arrow `->`.

The system supports several rules. The rules must be separated with
a semicolon `;` or written on separate lines. A rule without the
right-hand side is used as the initial state of the spatial hypergraph.

Hyperedge patterns can be described by using numbers and/or characters.
Several types of parentheses are supported. For example, a rule like
`{x,y}{x,z}->{x,y}{x,w}{y,w}{z,w}` is valid and can be converted to
default format by clicking `Check`.

Some rules to try out (just copy-paste the rule part):

- (1,2,3)(1,4,5)->(3,3,6)(4,5,6)(6,6,5);(1,1,1)(1,1,1)
- (1,1,2)(3,2,4)->(5,1,4)(3,2,3)(5,5,4);(1,1,1)(1,1,1)
- (1,2,2)(1,3,4)->(3,2,5)(5,5,2)(4,5,5);(1,1,1)(1,1,1) | Set event ordering: OLD
- (1,2,2)(1,3,4)->(1,5,2)(2,3,4)(4,5,5);(1,1,1)(1,1,1) | Set event ordering: OLD

## Simulation

Simulation has two modes/views: `Space` and `Time`.

In `Space` mode the system simulates the evolution of the spatial hypergraph. The
nodes representing "atoms of space" are joined by hyperedges representing their
relations. In the large-scale limit, the spatial hypergraph represents a space-like
state of the universe.  

In `Time` mode the system builds up a causal graph. In this view, the nodes are
updating events and the edges their causal relationships. According to the Wolfram
Physics Model, the flux of edges in the causal graph is related to physical
energy and momentum, and causal cones correspond to physical light cones with
lengths related to the speed of light.

Media control buttons let you rewind to the beginning, start/pause simulation and
skip to the end. `Speed` sets the frame rate.

## Highlighting Subgraphs

Subgraphs can be highlighted by clicking `RED`/`BLUE` and using one or more
of the supported commands:

Command | Description | Examples
--- | --- | ---
`geodesic(v1,v2,[dir],[rev],[all])`<br/><br/>Optional keywords: `dir` = directed edges, `rev` = reverse edge direction, `all` = show all shortest paths. | Shortest path between two nodes. | `geodesic(0,10,all)`
`nball(center,radius,[dir],[rev])`<br/><br/>Optional keywords: `dir` = directed edges, `rev` = reverse edge direction. | A the set of nodes/edges within a certain graph distance `radius` of a given node `center`. | `nball(0,4)`
`nsphere(center,radius,[dir],[rev])`<br/><br/>Optional keywords: `dir` = directed edges, `rev` = reverse direction. | N-dimensional sphere from vertex `center` with radius `radius`. | `nsphere(0,4,dir)`
`random(v,[distance],[dir],[rev])`<br/><br/>Optional parameter: `distance` max steps, keywords: `dir` = use directed edges, `rev` = reverse direction. | Random walk starting from node `v` . | `random(1)`
`worldline(v)`<br/><br/>*Note: Available only in `TIME` mode* | Time-like curve of the space-like node `v`. | `worldline(0)`
`lightcone(v,length)`<br/><br/>*Note: Available only in `TIME` mode* | Lightcone centered at node `v` with length `length`. | `lightcone(200,4)`



