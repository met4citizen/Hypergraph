# Hypergraph Rewriting System 3D

https://met4citizen.github.io/Hypergraph/

The app uses [3d Force-Directed Graph](https://github.com/vasturiano/3d-force-graph),
[ThreeJS](https://github.com/mrdoob/three.js/)/WebGL for 3D rendering and
[d3-force-3d](https://github.com/vasturiano/d3-force-3d) for the underlying
physics engine.

For more information on Hypergraph Rewriting Systems and their potential to
represent fundamental physics see [The Wolfram Physics Project](https://www.wolframphysics.org)
website and especially their [technical documents](https://www.wolframphysics.org/technical-documents/).

## Rules

Change the rewriting rule and related settings by clicking `RULE`.
Settings include different rule and event orderings and maximum
number of rewriting events (size). Run the rule by clicking `RUN`. 

An example of a hypergraph rewriting rule:

```
(1,1,2)(2,3,4)->(1,5,4)(2,5,3)(5,5,4)
(1,1,1)(1,1,1)
```

Whenever the left-hand side pattern `(1,1,2)(2,3,4)` is
found on the hypergraph, it is replaced with the pattern of the
right-hand side `(1,5,4)(2,5,3)(5,5,4)`. The two sides are
separated with an arrow `->`.

The system supports several rules separated either with a semicolon `;` or
each rule written on a separate line. A rule without the right-hand side
is used as the initial state of the spatial hypergraph.

Hyperedge patterns can be described by using numbers and/or characters.
Several types of parentheses are also supported. That is, a rule like
`{x,y}{x,z}->{x,y}{x,w}{y,w}{z,w}` is valid and can be converted to
default format by clicking `Check`.

Some rules you can try out (just copy-paste the rule part):

- (1,2,3)(1,4,5)->(3,3,6)(4,5,6)(6,6,5);(1,1,1)(1,1,1)
- (1,1,2)(3,2,4)->(5,1,4)(3,2,3)(5,5,4);(1,1,1)(1,1,1)
- (1,2,2)(1,3,4)->(3,2,5)(5,5,2)(4,5,5);(1,1,1)(1,1,1) | Set event ordering: OLD
- (1,2,2)(1,3,4)->(1,5,2)(2,3,4)(4,5,5);(1,1,1)(1,1,1) | Set event ordering: OLD

## Simulation

Force-simulation has two modes: `Space` and `Time`.

In `Space` mode the system simulates the evolution of the spatial hypergraph. The
spatial hypergraph represents a space-like state of the universe in which nodes
represent "atoms of space" joined by hyperedges.

In `Time` mode the system builds up a causal graph between updating events.
The nodes are updating events and the directed acyclic edges causal relationships.
According to the Wolfram Physics Model, the flux of edges in the causal graph
is related to physical energy and momentum.

Media control buttons let you rewind to the beginning, start/pause animation and
skip to the end of the animation. `Speed` selects either slow or fast frame rate.

## Highlighting Subgraphs

Subgraphs can be highlighted by clicking `RED`/`BLUE` and adding one or more
commands:

Command | Description | Examples
--- | --- | ---
`geodesic(v1,v2,[dir],[rev],[all])`<br/>Optional keywords: `dir` = directed edges, `rev` = reverse edge direction, `all` = show all shortest paths. | Shortest path between two nodes. In general relativity, the paths of particles acted on only by gravity are geodesics in curved space. | `geodesic(0,10,all)`
`nball(center,radius,[dir],[rev])`<br/>Optional keywords: `dir` = directed edges, `rev` = reverse edge direction. | A the set of nodes/edges within a certain graph distance `radius` of a given node `center`. If the graph or hypergraph approximates n-dimensional space, the leading term in the growth rate of geodesic balls with radius is r^n. | `nball(0,4)`
`nsphere(center,radius,[dir],[rev])`<br/>Optional keywords: `dir` = directed edges, `rev` = reverse direction. | N-dimensional sphere from vertex `center` with radius `radius`. | `nsphere(0,4,dir)`
`random(v,[distance],[dir],[rev])`<br/>Optional parameter: `distance` max steps, keywords: `dir` = use directed edges, `rev` = reverse direction. | Random walk from starting from node `v` . | `random(1)`
`worldline(v)`<br/>Note: Available only in `TIME` mode. | Time-like curve of the node `v`. | `worldline(0)`
`lightcone(v,length)`<br/>Note: Available only in `TIME` mode. | Lightcone centered at `v` with length `length`. | `lightcone(200,4)`



