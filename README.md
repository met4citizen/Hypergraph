# Hypergraph Rewriting System 3D

A web app to rewrite and simulate hypergraphs in 3D:

https://met4citizen.github.io/Hypergraph/

The app uses [3d Force-Directed Graph](https://github.com/vasturiano/3d-force-graph),
[ThreeJS](https://github.com/mrdoob/three.js/)/WebGL for 3D rendering and
[d3-force-3d](https://github.com/vasturiano/d3-force-3d) for the underlying
physics engine.

For more information on Hypergraph Rewriting Systems and their potential to
represent fundamental physics see [The Wolfram Physics Project](https://www.wolframphysics.org)
and its [technical documents](https://www.wolframphysics.org/technical-documents/).

## Rules

Change the rewriting rule or its settings by clicking `RULE`. Run the rule
by clicking `RUN`. Settings include different rule/event orderings and maximum
number of rewriting events (size).

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
each rule written on a separate line. A rule without the right-hand side is used as
the initial state of the spatial hypergraph.

Hyperedge patterns can be described by using numbers and/or characters.
Several types of parentheses are also supported. That is, a rule like
`{x,y}{x,z}->{x,y}{x,w}{y,w}{z,w}` is valid and can be converted to
default format by clicking `Check`.

## Simulation

Force-simulation has two modes: `Space` and `Time`.

In `Space` mode the system simulates the evolution of the spatial hypergraph. The
spatial hypergraph represents a space-like state of the universe with nodes as
"atoms of space" joined by hyperedges.

In `Time` mode the system builds up a causal graph between updating events.
The nodes of the DAG are updating events and the directed edges causal relationships.
According to the Wolfram Physics Model, the flux of edges in the causal graph
is related to physical energy and momentum.

Media control buttons let you rewind to the beginning, start/pause animation and
skip to the end of the animation. `Speed` selects the frame rate (slow/fast).

## Highlighting Subgraphs

Subgraph can be highlighted by clicking `RED`/`BLUE`and adding one or more
commands:

Command | Description | Examples
--- | --- | ---
`geodesic(v1,v2,[dir],[rev],[all])` | Shortest path between two nodes. In general relativity, the paths of particles acted on only by gravity are geodesics in curved space. Optional keywords: `dir` = directed edges, `rev` = reverse edge direction, `all` = show all shortest paths. | `geodesic(0,10,all)`
`nball(center,radius,[dir],[rev])` | A the set of nodes/edges within a certain graph distance `radius` of a given node `center`. If the graph or hypergraph approximates n-dimensional space, the leading term in the growth rate of geodesic balls with radius is r^n. Optional keywords: `dir` = directed edges, `rev` = reverse edge direction. | `nball(0,4)`
`nsphere(center,radius,[dir],[rev])` | N-dimensional sphere from vertex `center` with radius `radius`. Optional keywords: `dir` = directed edges, `rev` = reverse direction. | `nsphere(0,4,dir)`
`random(v,[distance],[dir],[rev])` | Random walk from starting from node `v` . Optional parameter: `distance` max steps, optimal keywords: `dir` = use directed edges, `rev` = reverse direction. | `random(1)`
`worldline(v)` | Time-like curve of the node `v`. Available only in `TIME` mode. | `worldline(0)`
`lightcone(v,length)` | Lightcone centered at `v` with length `length`. Available only in `TIME` mode. | `lightcone(200,4)`



