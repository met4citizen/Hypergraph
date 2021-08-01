# Hypergraph Rewriting System

<img src="screenshot.jpg" width="512">

**Run it: https://met4citizen.github.io/Hypergraph/**

A hypergraph is a generalization of a regular graph in which an edge can join
any number of nodes. In a hypergraph rewriting system some initial hypergraph
is transformed incrementally by making a series of updates that
follow some abstract rewriting rule. That is, by following a given rule,
subhypergraphs with particular canonical form are replaced with other
subhypergraphs with different canonical form.

The web app uses
[3d Force-Directed Graph](https://github.com/vasturiano/3d-force-graph)
for representing graph structures,
[ThreeJS](https://github.com/mrdoob/three.js/)/WebGL for 3D rendering and
[d3-force-3d](https://github.com/vasturiano/d3-force-3d) for the force engine.

For more information about hypergraph rewriting systems and their potential to
represent fundamental physics visit
[The Wolfram Physics Project](https://www.wolframphysics.org) website.
According to their
[technical documents](https://www.wolframphysics.org/technical-documents/)
certain models can reproduce key features of both relativity and quantum mechanics.


## Rules

Click `RULE` to modify the rewriting rule or change its settings. The settings
include different options for rule ordering, event ordering and the max number
of rewriting events. Click `RUN` to start the rewriting process.

An example of a hypergraph rewriting rule:

```
(1,1,2)(2,3,4)->(1,5,4)(2,5,3)(5,5,4)
(1,1,1)(1,1,1)
```

In the above case, wherever a subhypergraph in the form of the left-hand side
pattern `(1,1,2)(2,3,4)` is found on the hypergraph, it is replaced with
a new subhypergraph in the form of the right-hand side pattern
`(1,5,4)(2,5,3)(5,5,4)`. The two sides of any one-way rule must be separated
with an arrow `->`. The separator `==` can be used as a shortcut for a two-way
setup, which includes both the rule and its inverse.

Hyperedge patterns can be described by using numbers and/or
characters. Several types of parentheses are supported. For example, a rule
such as `[{x,y}{x,z}]->[{x,y}{x,w}{y,w}{z,w}]` is considered valid and can be
converted to the default format by clicking `Scan`.

A rule without the right-hand side `(1,1,1)(1,1,1)` is used as the initial
graph. An alternative way of to specify the initial state is to use some of
the predefined functions described in the following table.

Initial graph | Description
--- | ---
`points(n)` | `n` unconnected vertices.
`line(n)` | Line with `n` vertices.
`grid(n,d)` | Grid in `d` dimensions with approximately `n` vertices.
`sphere(n)` | Sphere with `n` vertices.
`random(n,d,nedges)` | Random graph with `n` vertices so that each vertex is sprinkled randomly in `d` dimensional space and has at least `nedges` connections.
`complete(n)` | Complete graph with `n` vertices so that each vertex is connected to every other vertex.
`blackhole(n,rs)` | Black hole with `n` vertices and Schwarzschild radius `rs`. EXPERIMENTAL
`blackhole2(n,rs)` | Twin black hole so that both black holes have `n` vertices and Schwarzschild radius `rs`. EXPERIMENTAL
`erb(n,rs)` | Einstein-Rosen Bridge so that both sides have `n` vertices and Schwarzschild radius `rs`. EXPERIMENTAL

During the rewriting process there can be overlapping matches for
the left-hand side part of the rule. In these cases "event order" setting
is used to decide which of the overlapping matches are replaced and which are
ignored.

Event order | Description
--- | ---
`RND` | Random order shuffles all possible update events/matches. (DEFAULT)
`WM` | Standard event order in the Wolfram Model (LeastRecentEdge + RuleOrdering + RuleIndex). Note: Do not define rule order separately, because it would override event order. EXPERIMENTAL
`ASC` |  Ascending time order sorts update events so that the oldest edge is applied first.
`DEC` | Descending time order Sort update event so that the newest edge is applied first.

The system supports several rules separated with a semicolon `;` or written
on separate lines. If several rules are specified, the "rule order" setting
is used to define whether their relative order matters.

Rule order | Description
--- | ---
`NON` | None. Follow event ordering without sorting based on rules. In other words, allow mixing of the rules. DEFAULT
`NDX` | Index order. Regardless of the event ordering, always try to apply the events in the order in which rules are specified.
`REV` | Reverse index order.

## Simulation

Simulator currently supports two modes: `Space` and `Time`.

In `Space` mode the system simulates the evolution of the hypergraph.

In `Time` mode the system builds up the transitive reduction of the causal
graph. In this view nodes represent updating events and directed
edges their causal relations.

Media buttons let you reset the mode, start/pause simulation and
skip to the end / reheat force engine.

According to the Wolfram Model, the spatial hypergraph represents a spacelike
state of the universe with nodes as "atoms of space". The flux of causal edges
through spacelike and timelike hypersurfaces is related to energy and momentum
respectively.

## Quantum Mechanics

The left hand side patterns often produce many overlapping matches. According
to the Wolfram model, applying them all gives rise to quantum mechanics with
many possible branches of histories.

This simulator follows only one (classical) branch, because following
them all would be computationally hard. However, if the rule option `QM`
is selected, the simulator tries to maximize the rewrites by ignoring the edges
that are both removed and added with a single update. In some cases this
allows more overlapping matches to be applied in one single step.

In order to simulate interference, the left hand side of the rule can have
a filter with the `\` option. For example, a rule `(1)(1,2)\(2)->(1)(1,2)(2)`)
is only applied, if no match is found for `(2)`. With the `QM` option set,
this check is made just before each update.


## Highlighting

When the simulation ends, subgraphs can be highlighted by clicking `RED`/`BLUE`
and using one or more of the following commands:

Command | Highlighted | Status Bar
--- | --- | ---
`geodesic(n1,n2,[dir],[rev],[all])`<br/><br/>`dir` = directed edges<br/>`rev` = reverse direction<br/>`all` = all shortest paths | Shortest path(s) between two nodes.<br/><br/> | Path distance as the number of edges.
`curv(n1,n2)` | Two n-dimensional balls of radius one and the shortest path between their centers. | Curvature based on Ollivier-Ricci (1-Wasserstein) distance.
`nball(center,radius,[dir],[rev])`<br/><br/>`dir` = directed edges<br/>`rev` = reverse direction | N-dimensional ball is a set of nodes and edges within a distance `radius` from a given node `center`. | Volume as the number of edges.
`nsphere(center,radius,[dir],[rev])`<br/><br/>`dir` = directed edges<br/>`rev` = reverse direction | N-dimensional sphere/hypersurface within a distance `radius` from a given node `center`. | Area as the number of nodes.
`random(n,distance,[dir],[rev])`<br/><br/>`dir` = directed edges<br/>`rev` = reverse direction | Random walk starting from a specific node with some maximum `distance`. | Path distance as the number of edges.
`(x,y)(y,z)` | Hypersurfaces matching the given rule-based pattern. With a prefix '-' the matched hypersurfaces are excluded from the results. NOTE: Matching is always done in `SPACE` mode and only projected to `TIME` mode by highlighting world lines of the matched hypersurface. | The number of rule-based matches.
`space(n1,n2)` | Space-like hypersurface based on a range of nodes. `SPACE` mode only. | Volume as the number of nodes.
`time(t1,t2)` | Time-like hypersurface based on a range of iterations. `TIME` mode only. | Volume as the number of nodes.
`worldline(n1,n2,...)` | Time-like curve of space-like node/nodes. `TIME` mode only. | Distance as the number of edges.
`lightcone(n,length)` | Lightcone centered at node `n` with size `length`. `TIME` mode only. | Size of the cones as the number of edges.

## Scalar Fields

Scalar fields can be highlighted by clicking `GRAD`. Relative intensity of the
field is represented by different hues of colour from light blue (lowest) to
green to yellow (mid) to orange to red (highest). Field values are
calculated for each vertex and the colours for edges represent the mean of
the values of the vertices they connect.

Scalar Field | Description
--- | ---
`created` | Creation time from oldest to newest.
`updated` | Last update time from oldest to newest. For causal graph the same as 'created'.
`degree` | Number of incoming and outgoing edges.
`indegree` | Number of incoming edges.
`outdegree` | Number of outgoing edges.
`curvature` | Ollivier-Ricci curvature calculated as the mean of the vertex's edges.
`energy` | The average number of updated edges.
`mass` | The part of 'energy' in which the right hand side edges connect pre-existing vertices.
`momentum` | The part of 'energy' in which the right hand side edges have new vertices.
`action` | The average number of causal edges.
`spin` | The average number of edge direction flips.
`activity` | For spatial graph the world line length. For causal graph the crossings of the world lines.
`frequency` | Aperiodic frequency of spins calculated as the total number of spins divided by the length of the vertex's world line. `SPACE` mode only.

The setting `Radius` can be used to change sample size. In spatial graphs it
defines the radius of a n-ball. In causal graphs it defines the length of the
light cone. The setting `Filter` can be use to show only certain range of
values: low (<25%), mid (25%-75%), hi (>75%). If several fields are specific,
the shown intensity represents their average.

## Notes

The aim of this project has been to learn some basic concepts and
ideas related to hypergraphs and hypergraph rewriting. Whereas the Wolfram
physics project has been a great inspiration, this project is not
directly associated with it, doesn't use any code from it, and doesn't claim
to be compatible with the Wolfram Model.

The idea of "atoms of space" is not a new one. It already appears in the old
Greek tradition of atomism (*atomos*, "uncuttable") started by Leucippus
(5thC BCE) and his pupil Democritus (ca. 460–370 BCE). In the Hellenistic
period the idea was revived by Epicurus (341–270 BCE) and a Roman poet
Lucretius (ca. 99–55 BCE). Unfortunately, starting from the Early Middle Ages,
atomism was mostly forgotten in the Western world until Lucretius'
*De rerum natura* and other atomist teachings were rediscovered
in the 14th century.

> “The atoms come together in different order and position, like letters,
> which, though they are few, yet, by being placed together in different ways,
> produce innumerable words.”
> -- Epicurus, according to Lactantius
