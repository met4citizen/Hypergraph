# Hypergraph Rewriting System 3D

A web application to rewrite and represent hypergraphs in 3D:

https://met4citizen.github.io/Hypergraph/

The app uses [3d Force-Directed Graph](https://github.com/vasturiano/3d-force-graph),
[ThreeJS](https://github.com/mrdoob/three.js/)/WebGL for 3D rendering and
[d3-force-3d](https://github.com/vasturiano/d3-force-3d) for the underlying
physics engine.

## Rules

Change the rewriting rule by clicking `RULE`. Run the rule by clicking `RUN`.
Settings include different rule/event orderings and maximum number of
rewriting events (size).

An example of a hypergraph rewriting rule:

```
(1,1,2)(2,3,4)->(1,5,4)(2,5,3)(5,5,4)
(1,1,1)(1,1,1)
```

Whenever a subgraph matching the rule's left-hand side `(1,1,2)(2,3,4)` is
found on the hypergraph, it is replaced with the pattern of to the rule's
right-hand side `(1,5,4)(2,5,3)(5,5,4)`. The two sides should be separated with
an arrow `->`.

The app support several rules. Separate them either with a semicolon `;` or
write them on separate lines. A rule without the right-hand side is used as
the initial state of the hypergraph.

Hyperedge patterns on rules can be described by using numbers and/or characters.
Several types of parentheses are supported. That is, a rule like
`{x,y}{x,z}->{x,y}{x,w}{y,w}{z,w}` is valid.

## Simulation

Simulation has two modes: `Space` and `Time`.

In `Space` mode the system simulates the evolution of the spatial hypergraph, which
represents a space-like state of the universe. The nodes of the spatial hypergraph
are "atoms of space" joined by hyperedges.

In `Time` mode the system displays causal relationships between updating events.
The nodes of the causal graph are updating events and the edges show causal relationships.
The flux of edges in the causal graph is related to physical energy and momentum[^1].

Media controls of the simulation let you rewind to the beginning, start/pause animation and
skip to the end of the animation. `Speed` selects the frame rate (slow/fast).

## Highlighting (RED/BLUE)

Command | Description | Examples
--- | --- | ---
`geodesic(v1,v2,[dir],[rev],[all])` | Shortest path from node `v1` to `v2`. In general relativity, the paths of particles acted on only by gravity are geodesics in curved space. Optional: `dir` directed edges, Optional: `rev` reverse direction, `all` show all shortest paths. | `geodesic(0,10,all)`
`nball(center,radius,[dir],[rev])` | N-dimensional ball from vertex `center` with radius `radius`. a geodesic ball is the set of nodes within a certain graph distance of a given node. If the graph or hypergraph approximates d-dimensional space, the leading term in the growth rate of geodesic balls with radius is r^d. Optional: `dir` directed edges, `rev` reverse direction.
`nsphere(center,radius,[dir],[rev])` | N-dimensional sphere from vertex `center` with radius `radius`. Optional: `dir` directed edges, `rev` reverse direction. | `nball(0,4)`
`random(v,[distance],[dir],[rev])` | Random walk from vertex `v` . Optional: `distance` max steps, `dir` use directed edges, `rev` reverse direction. | `nsphere(0,4,dir)`
`worldline(v)` | Time-like curve of the vertex `v`. Only in `TIME` mode. | `worldline(0)`
`lightcone(v,length)` | Lightcone centered at `v` with length `length` Only in `TIME` mode. | `lightcone(200,4)`

## References

[^1]: <https://www.wolframphysics.org/technical-documents/>


