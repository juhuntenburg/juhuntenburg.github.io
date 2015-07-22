// global parameters
var w=$("#svg").attr("width");
var h=$("#svg").attr("height");
var o={"x":w/2, "y":h/2}; //origin
var rad=10; // initial minor radius of the model
var skew=1.5 // skewness in x direction
var rad_minor=rad;
var rad_major=skew*rad
var stoprad=h/2
var dotrad=1; // radius of the dots
var ndot=10; //number of initial dots

var g=.02; //growth
var prob=.01; //probability of connection to form
var dist=6 // max distance of connections to form (multiplied by resting length)
var young=.5; // young modulus for elasticity

var nclust=3; // number of cluster for k-means in vis

// other global variables
var P=[]; // list of dots
var E=[]; // list of edges
var G=[]; // graph

// set default values for input
$("#growth").val(g);
$("#nodes").val(ndot);
$("#prob").val(prob);
$("#dist").val(dist);
$("#skew").val(skew);
$("#young").val(young);
$("#nclust").val(nclust);

// function to add elements to SVG
function makeSVG(tag, attrs) {
    var el=document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (var k in attrs)
        el.setAttribute(k, attrs[k]);
    return el;
};

//function to subtract two vectors
function subvec(a,b) {
    return {"x":a.x-b.x, "y":a.y-b.y}
}

//function calculate length of vector
function lenvec(a) {
    return Math.sqrt(Math.pow(a.x, 2)+Math.pow(a.y, 2))
}

//function to multiply vector a with constant k
function mulvec(a, k) {
    return {"x":a.x*k, "y":a.y*k};
}

//function to multiply vector a with constant k
function addvec(a, b) {
    return {"x":a.x+b.x, "y":a.y+b.y};
}

// function to approximate the arc length of an ellipse over a given radians
function arcFromRad(p0, delta, stopRad, startRad) {
    var arc = 0;
    if (typeof(startRad)==='undefined') {
        var t0 = 0; } else {
            var t0=startRad;
        }
    for(t=t0;t<=stopRad;t+=delta) {
        var p = {x:o.x+rad_major*Math.cos(t),y:o.y+rad_minor*Math.sin(t)};
        arc += lenvec(subvec(p,p0));
        p0.x = p.x;
        p0.y = p.y;
    };
    return arc
};

// function to produce evenly spaced dots on a given arc of an ellipse
function equalPoints(p0, stopArc, ndot, delta, startRad) {
    var eP = [];
    var arc = 0;
    if (typeof(startRad)==='undefined') {
        var t = 0 }
    else {
        var t=startRad;
    };
    var p = {'x':p0.x, 'y':p0.y}
    var i;
    for (i=0; i<ndot; i++) {
        // set the desired arc length for each dot
        var arcGoal = i*stopArc/ndot;
        while (arc < arcGoal){
            // store diff
            var diff = arcGoal - arc;
            // update p0 to current point
            p0.x=p.x;
            p0.y=p.y;
            // increase angle
            t += delta;
            // calculate new point on ellipse from this angle
            p = {'x':o.x+rad_major*Math.cos(t),
                 'y':o.y+rad_minor*Math.sin(t)}
            // update arc
            arc += lenvec(subvec(p,p0));
        };
        // if there is an overshoot
        if (arc > arcGoal) {
            new_diff = arc - arcGoal;
            // compare overshoot to last undershoot
            new_delta = delta/(diff+new_diff)*diff;
            // correct delta and recalculate p
            t -= delta;
            t += new_delta;
            p = {'x':o.x+rad_major*Math.cos(t),
                 'y':o.y+rad_minor*Math.sin(t)}
        };
        p.n=[];
        p.t=t;
        eP.push(p);
    };
    return eP
};

// function to initiate dots
function initdot() {
    // if the model is circular, points can be calculated from equal angles 2Pi/ndot
    if (rad_major==rad_minor) {
        var i;
        for (i=0; i<ndot; i++) {
            // divide surface in equal pieces depending on number of dot
            var p = {'x':o.x+rad_minor*Math.cos(i/ndot*2*Math.PI),
                     'y':o.y+rad_minor*Math.sin(i/ndot*2*Math.PI),
                     'n':[]};
            P.push(p);
        };
    // if the model is an ellipse, the points have to be approximated numerically to divide the perimeter equally
    } else if (rad_major>=rad_minor) {
        var delta = 0.00001
        var p0 = {'x':o.x+rad_major, 'y':o.y+0};
        var peri = arcFromRad(p0=p0, delta=delta, stopRad=2*Math.PI);
        p0 = {'x':o.x+rad_major, 'y':o.y+0};
        P = equalPoints(p0=p0, stopArc=peri, ndot=ndot, delta=delta);
    };
    // draw the points
    var j;
    for (j=0; j<P.length; j++) {
        p = P[j];
        dot=makeSVG('circle', {id:"p"+j, cx:p.x, cy:p.y, r:dotrad, fill:"grey", stroke:"grey"});
        $("#svg")[0].appendChild(dot);
    }
    // and return them for the edge function
    return P
};


// function to initiate edges
function initedge(P) {
    // initiate edges
    var i;
    for (i=0; i<P.length; i++) {
        var e={};
        if (i<ndot-1)
            e={"a":i, "b":i+1}
        else if (i=ndot-1)
            e={"a":i, "b":0}
        E.push(e);
        line=makeSVG('line', {id:"e"+i, x1:P[e.a].x, y1:P[e.a].y, x2:P[e.b].x, y2:P[e.b].y, stroke:"grey"});
        $("#svg")[0].appendChild(line)
    };
    return E
};

// function to get resting edge length
function rest(P,E) {
    //this only works if all dots are equally spaced
    if (rad_minor == rad_major){
        var r = lenvec(subvec(P[E[0].a], P[E[0].b]));
    } else if (rad_minor < rad_major) {
        p0 = {'x':P[E[0].a].x, 'y':P[E[0].a].y};
        delta = 0.00001;
        peri = arcFromRad(p0=p0, delta=delta, stopRad=2*Math.PI)
        var r = peri/ndot;
    };
     return r;
 };

 // function to implement elasticity of vectors between origin and points
 function elasticity(p0, p1) {
     var p0=p0;
     var p1=p1;
     var r=lenvec(subvec(p0,o)); // resting length of spring
     var d=subvec(p1,o);// vector from origin to new point (deformed spring)
     var l=lenvec(d); // length of deformed spring
     var a={} // acceleration
     var f={} // force
     var v={'x':0, 'y':0} // velocity
     f=mulvec(d, (young*(r-l)/l)); // Hook's law F=-k*(r-l), divide by length to only get direction of vector
     // shouldn't it be dependent on resting length instead of deformed length?
     p1=addvec(p1, f); //Integration of velocity into position
     return p1;
 }

 // functions to calculate network measures:
 // see: http://nbviewer.ipython.org/github/deep-introspection/My-Random-Notebooks/blob/master/Growing%20networks.ipynb
 function graphMetrics(P) {
     G = new jsnx.Graph();
     for (i=0; i<P.length; i++) {
         G.addNodesFrom([i])
         var j;
         for (j=0; j<P[i].n.length; j++) {
             G.addEdgesFrom([[i,P[i].n[j]]])
         }
     }
     // To draw:
     // jsnx.draw(G, {element: '#svg',  });
     // jsnx.shortestPathLength(i)._numberValues[i]._numberValues)
     return G;
 }

function globalefficiency(G) {
    var inv_lengths = [];
    for (node=0; node<G.numberOfNodes(); node++) {
        lengths = jsnx.singleSourceShortestPathLength(G,node)._numberValues;
        //lengths = lengths[0];
        inv = $.map(lengths,function(i) {return 1/i});
        inv_lengths = $.extend(inv_lengths, inv);
    }
    var total = 0;
    $.map(inv_lengths, function(ind){
        if (ind!=Infinity) {total = total + ind;}
    });
    return total/(G.numberOfNodes()*(G.numberOfNodes()-1));
}
function localefficiency(G) {
    var efficiencies = [];
    for (node=0; node<G.numberOfNodes(); node++) {
        var temp_G = new jsnx.Graph();
        temp_G.addNodesFrom(G.neighbors(node));
        for (nei=0; nei<temp_G.numberOfNodes(); nei++) {
            temp_G.addEdgesFrom(G.edges(nei));
        }
        efficiencies[node] = globalefficiency(temp_G);
    }
    return efficiencies
}
function avglocalefficiency(Gx) {
    eff = localefficiency(Gx)
    var total = 0;
    $.map(eff, function(ind){
        if (ind!=Infinity) {total = total + ind;}
    });
    return total/Gx.numberOfNodes();
}

// function to animate growth
function animate() {
    // update radius
    rad_major=lenvec(subvec(P[E[0].a],o));
    rad_minor=rad_major/skew

    // break loop if flag is true or radius exceeds threshold
    if (rad_minor>=stoprad || stopanimate==true) {
        return P;
    } else {
        requestAnimationFrame(animate);
        var i;
        for (i=0; i<E.length; i++) {
            delta=0.01
            // inserting new points if required
            // calculating edge length
            if (rad_minor==rad_major){
                var l = lenvec(subvec(P[E[i].a], P[E[i].b]));
            } else if (rad_minor < rad_major){
                p0 = {'x':P[E[i].a].x, 'y':P[E[i].a].y}
                if (P[E[i].b].t > 0) {var stopRad=P[E[i].b].t
                } else {var stopRad=2*Math.PI};
                var l = arcFromRad(p0=p0, delta=delta, stopRad=stopRad, startRad=P[E[i].a].t)
            };
            if (l>=2*r) {
                if (rad_minor == rad_major) {
                    // vector between neighbouring points
                    var newp=addvec(subvec(P[E[i].a],o), subvec(P[E[i].b],o));
                    // calculating length of new vector
                    var len_newp=lenvec(newp);
                    // divide by length to get only direction
                    newp=mulvec(newp, 1/len_newp);
                    // multiply by current radius
                    newp=mulvec(newp,rad_major);
                    newp=addvec(newp,o); // add origin
                } else if (rad_minor < rad_major){
                    var newp0 = {'x':P[E[i].a].x, 'y':P[E[i].a].y}
                    delta=0.0001
                    newP = equalPoints(p0=newp0, stopArc=l, ndot=2, delta=delta, startRad=P[E[i].a].t);
                    var newp=newP[1];
                };
                newp.n=[]; // add empty neighbour list
                P.push(newp); // new point is added to the end of the list
                E.push({"a":P.length-1, "b":E[i].b})// add new edge from newpoint to i+1
                E[i]={"a":E[i].a, "b":P.length-1} // updating edge from point i to newpoint (end of list)

                // add new dots
                dot=makeSVG('circle', {id:"p"+(P.length-1), cx:P[P.length-1].x, cy:P[P.length-1].y, r:dotrad, fill:"grey", stroke:"grey"});
                $("#svg")[0].appendChild(dot);

                // update first edge
                $("#e"+i).attr("x1", P[E[i].a].x);
                $("#e"+i).attr("y1", P[E[i].a].y);
                $("#e"+i).attr("x2", P[E[i].b].x);
                $("#e"+i).attr("y2", P[E[i].b].y);

                // add new edges
                line=makeSVG('line', {id:"e"+(E.length-1), x1:P[E[E.length-1].a].x, y1:P[E[E.length-1].a].y, x2:P[E[E.length-1].b].x, y2:P[E[E.length-1].b].y, stroke:"grey"});
                $("#svg")[0].appendChild(line);
            };
        };

        // grow, update dots
        for (i=0; i<P.length; i++) {
            var pvec=subvec(P[i], o); // vector from origin to point
            pvec=mulvec(pvec, 1+g); // make vector grow
            // pvec=mulvec(pvec, 1+(g/lenvec(pvec)));
            pvec=addvec(pvec, o); // add origin
            pvec=elasticity(p0=P[i], p1=pvec)
            P[i].x=pvec.x // update point
            P[i].y=pvec.y
            $("#p"+i).attr("cx", P[i].x);
            $("#p"+i).attr("cy", P[i].y);
        };

        // update edges
        for (i=0; i<E.length; i++) {

            $("#e"+i).attr("x1", P[E[i].a].x);
            $("#e"+i).attr("y1", P[E[i].a].y);
            $("#e"+i).attr("x2", P[E[i].b].x);
            $("#e"+i).attr("y2", P[E[i].b].y);
        };
        // make new connections
        for (i=0; i<P.length; i++) {
            //compute distance to other dots
            for (j=0; j<P.length; j++) {
                // for each dot go through all dots that have a higher index and update connections
                // if there is no connection yet between the dots, draw one in case the distance is smaller than a threshold
                if (i<j) {
                    // for non-existing connections, calculate length
                    if ($.inArray(j, P[i].n)==-1) {
                        var connvec = subvec(P[j],P[i]);
                        var connlen = lenvec(connvec);
                        if (connlen <= dist*r) {
                            // roll a dice if connection will be drawn
                            dice=Math.random()
                            if (dice <= prob) {
                                P[i].n.push(j);
                                connection=makeSVG('line', {id:"c"+i+j, x1:P[i].x, y1:P[i].y, x2:P[j].x, y2:P[j].y, stroke:"red"});
                                $("#svg")[0].appendChild(connection);
                            }
                        };
                    // update existing connections
                    } else {
                        $("#c"+i+j).attr("x1", P[i].x);
                        $("#c"+i+j).attr("y1", P[i].y);
                        $("#c"+i+j).attr("x2", P[j].x);
                        $("#c"+i+j).attr("y2", P[j].y);
                    };
                };
            };
        };
    };
	G = graphMetrics(P)
};

var stopanimate=true;

// update values from input if applicable and animate upon set
$("#start").click(function(){
    g=parseFloat($("#growth").val());
    ndot=parseFloat($("#nodes").val());
    prob=parseFloat($("#prob").val());
    skew=parseFloat($("#skew").val());
    dist=parseFloat($("#dist").val());
    young=parseFloat($("#young").val());
    stopanimate=false;
    $("#svg").empty();
    $("#matrix-div").empty();
    $("#force-div").empty();
    P=[];
    E=[];
    G=[];
    rad_minor=rad;
    rad_major=rad*skew;
    P=initdot();
    E=initedge(P);
    r=rest(P,E);
    stopanimate=false;
    animate();
	//$("#music")[0].play();
})

$("#stop").click(function(){
    stopanimate=true;
	$("#music")[0].pause();
})

// double check if values rest, and rads don't need to be updated here
$("#cont").click(function(){
    g=parseFloat($("#growth").val());
    ndot=parseFloat($("#nodes").val());
    prob=parseFloat($("#prob").val());
    dist=parseFloat($("#dist").val());
    stopanimate=false;
    animate();
	//$("#music")[0].play();
});

$("#compute").click(function(){
    $("#stats").html("<p>avg clustering: "+jsnx.averageClustering(G).toFixed(4)+
    "<br>glob efficiency.:      "+globalefficiency(G).toFixed(4)+
    "<br>avg loc efficiency.: "+avglocalefficiency(G).toFixed(4)+"</p>")
});

$("#vis").click(function(){
    // Structure data for input to protovis
    G = graphMetrics(P);
    var labels = [];
    var vectors = [];
    for (var j = 0 ; j < G.numberOfNodes(); j++) {
        labels[j] = j;
        var vec = []
        for (k=0; k<P[j].n.length; k++) {
            vec.push(P[j].n[k]);
        }
        vectors[j] = Array.apply(null, new Array(G.numberOfNodes())).map(Number.prototype.valueOf,0);
        for (h=0; h<vec.length; h++) {
            vectors[j][[vec[h]]] = 1;
        }
    }
    nclust=parseFloat($("#nclust").val());
    var clust = figue.kmeans(nclust, vectors);
    var clustlabels = clust.assignments;
    var nodes = [];
    var links = [];
    for (i=0; i<G.nodes().length; i++) {
        nodes[i]={"nodeName":G.nodes()[i], "group":clustlabels[i]};
    };
    for (i=0; i<G.edges().length; i++) {
          links[i] = {"source":G.edges()[i][0], "target":G.edges()[i][1], "value":"1"};
    };
    var mis = {nodes, links};

    // http://mbostock.github.io/protovis/ex/matrix.html
    var colorsF = pv.Colors.category10();

    var visM = new pv.Panel()
        .canvas('matrix-div');
    var layoutM = visM.add(pv.Layout.Matrix)
        .nodes(mis.nodes)
        .links(mis.links)
        .sort(function(a, b) {b.group - a.group});
    layoutM.link.add(pv.Bar)
        .fillStyle(function(l) {return l.linkValue
        ? ((l.targetNode.group == l.sourceNode.group)
        ? colorsF(l.sourceNode):colorsF(l.sourceNode.group)):"#eee"})
        .antialias(false)
        .lineWidth(1);

    // Labels NOT properly added yet
    layoutM.label.add(pv.Label)
        .textStyle(colorsF.by(function(d) {d.group}));
    visM.render();
    // http://mbostock.github.io/protovis/ex/force.html
    var visF = new pv.Panel()
        .canvas('force-div')
        .width($("#force-div").attr("width"))
        .height($("#force-div").attr("height"))
        .fillStyle("white")
       .event("mousedown", pv.Behavior.pan())
       .event("mousewheel", pv.Behavior.zoom());
    var forceF = visF.add(pv.Layout.Force)
        .nodes(mis.nodes)
        .links(mis.links);

    forceF.link.add(pv.Line);
    forceF.node.add(pv.Dot)
        .size(20)
        .fillStyle(function(d){return colorsF(d.group)})
        .strokeStyle("#ddd") //function() this.fillStyle())
        .lineWidth(1)
        .antialias(false)
        //.title(function(d) {return d.nodeName})
        .event("mousedown", pv.Behavior.drag())
        .event("drag", forceF);

    visF.render();
    // Recolor main view nodes
    for (i=0; i<P.length; i++) {
            $("#p"+i).attr("fill",colorsF(clustlabels[i]).color);
            $("#p"+i).attr("stroke",colorsF(clustlabels[i]).color);
    };
});

$("#download").click(function(){
});
