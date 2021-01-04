# Hypergraph Rewriting System

<img src="screenshot.jpg" width="512">

**Run it: https://met4citizen.github.io/Hypergraph/**

A hypergraph is a generalization of a regular graph in which an edge (called hyperedge)
can join any number of nodes. In a hypergraph rewriting system some initial
state is transformed incrementally by making a series of updating events that follow
some abstract rewriting rule. That is, by following a given rule, subhypergraphs
with particular canonical form are replaced with other subhypergraphs with different
canonical form.

For more information about hypergraph rewriting systems and their potential to
represent fundamental physics visit [The Wolfram Physics Project](https://www.wolframphysics.org)
website. According to their [technical documents](https://www.wolframphysics.org/technical-documents/)
certain models exhibiting the Church-Rosser property (causal invariance) reproduce key
features of both quantum mechanics and special/general relativity.

The web app uses [3d Force-Directed Graph](https://github.com/vasturiano/3d-force-graph)
for representing graph structures, [ThreeJS](https://github.com/mrdoob/three.js/)/WebGL
for 3D rendering and [d3-force-3d](https://github.com/vasturiano/d3-force-3d) for the
force engine.

## Rules

Click `RULE` to modify the rewriting rule and change its settings. Settings include
different options for rule ordering and event orderings and the max number of
rewriting events. Click `RUN` to start the rewriting process. 

An example of a hypergraph rewriting rule:

```
(1,1,2)(2,3,4)->(1,5,4)(2,5,3)(5,5,4)
(1,1,1)(1,1,1)
```

Wherever a subhypergraph in the form of the left-hand side pattern `(1,1,2)(2,3,4)`
is found on the hypergraph, it is replaced with a new subhypergraph in the
form of the right-hand side pattern `(1,5,4)(2,5,3)(5,5,4)`. The two sides must be
separated with an arrow `->`. A rule without the right-hand side is used as the initial
state.

The system supports several rules separated with a semicolon `;` or written
on separate lines. Hyperedge patterns can be described by using numbers and/or
characters. Several types of parentheses are supported. For example, a rule like
`[{x,y}{x,z}]->[{x,y}{x,w}{y,w}{z,w}]` is considered valid and can be
converted to the default format by clicking `Check`.

Some rules to try out (copy-paste the rule part and change the setting if specified):

- (1,2)(1,3)->(1,2)(1,4)(2,4)(3,4)
- (1,2,3)(1,4,5)->(3,3,6)(4,5,6)(6,6,5);(1,1,1)(1,1,1)
- (1,1,2)(3,2,4)->(5,1,4)(3,2,3)(5,5,4);(1,1,1)(1,1,1)
- (1,2,2)(1,3,4)->(3,2,5)(5,5,2)(4,5,5);(1,1,1)(1,1,1) | Set event ordering: OLD
- (1,2,2)(1,3,4)->(1,5,2)(2,3,4)(4,5,5);(1,1,1)(1,1,1) | Set event ordering: OLD

## Simulation

Simulation currently supports two modes: `Space` and `Time`.

In `Space` mode the system simulates the evolution of the spatial hypergraph.
According to the Wolfram Model, the spatial hypergraph represents a spacelike
state of the universe with nodes as "atoms of space".

In `Time` mode the system builds up the causal graph. In this view, the nodes are
updating events and the directed edges their causal relationships. According to the
Wolfram Model, the flux of causal edges through spacelike and timelike hypersurfaces
is related to energy and momentum respectively.

Media control buttons let you rewind to the beginning, start/pause simulation and
skip to the end / reheat. `Speed` sets the frame rate.

## Highlighting

When the simulation ends, subgraphs can be highlighted by clicking `RED`/`BLUE`
and using one or more of the following commands:

Command | Description | Examples
--- | --- | ---
`geodesic(n1,n2,[dir],[rev],[all])` | Shortest path between two nodes.<br/><br/>`dir` = directed edges<br/>`rev` = reverse edge direction<br/>`all` = show all shortest paths | `geodesic(0,10)`<br/>`geodesic(10,200,all)`
`nball(center,radius,[dir],[rev])` | N-dimensional ball is a set of nodes and edges within a distance `radius` of a given node `center`. | `nball(0,4)`
`nsphere(center,radius,[dir],[rev])` | N-dimensional sphere/hypersurface is a set of nodes within a distance `radius` of a given node `center`. | `nsphere(0,4)`
`random(n,distance,[dir],[rev])` | Random walk starting from a specific node with some maximum `distance`. | `random(1,100,dir)`
`space(n1,n2)` | Space-like hypersurface based on a range of nodes. `SPACE` mode only. | `space(100,150)`
`time(t1,t2)` | Time-like hypersurface based on a range of iterations. `TIME` mode only. | `time(300,350)`
`worldline(n)` | Time-like curve of the space-like node. `TIME` mode only. | `worldline(0)`
`lightcone(n,length)` | Lightcone centered at node `n` with size `length`. `TIME` mode only. | `lightcone(200,4)`

## Notes

During the rewriting process there are often several overlapping matches for the left-hand side part
of the rule. In these cases event ordering setting is used to decide which of the overlapping matches
are replaced and which are ignored. In physical reality, however, all such matches would be replaced
giving rise to quantum mechanics. This means that the simulator shows only one possible classical
evolution of the hypergraph.


