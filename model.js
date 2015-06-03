// parameters
var P=[]; // list of dots
var E=[]; // list of edges
var w=$("#svg").attr("width");
var h=$("#svg").attr("height");
var rad=20; // initial radius of the model
var dotrad=3; // radius of the dots
var ndot=4; //number of initial dots
var o={"x":w/2, "y":h/2}; //origin
var g=0.5; //growth
var prob=0.01; //probability of connection to form
var stoprad=10 // to multiple by rad for stopping point
var dist=4 // to multiple by rad for stopping point
var skew=1 // skewness in y direction

// set default values for input
$("#growth").val(g);
$("#nodes").val(ndot);
$("#prob").val(prob);
$("#dist").val(dist);
$("#skew").val(skew);

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

// function to initiate dots
function initdot() {
    // initiate dots
    for (i=0; i<ndot; i++) {
        var p={}; // single dot
        // this already need fixing, dots are not spaced equally 
        p.x=w/2+skew*rad*Math.cos(i*2*Math.PI/ndot);
        p.y=h/2+rad*Math.sin(i*2*Math.PI/ndot);
        p.n=[];
        P.push(p);
        dot=makeSVG('circle', {id:"p"+i, cx:p.x, cy:p.y, r:dotrad, fill:"grey", stroke:"grey"});
        $("#svg")[0].appendChild(dot);
    };
    return P
};

// function to initiate edges
function initedge(P) {
    // initiate edges
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
    //this only works if 
     var r = lenvec(subvec(P[E[0].a], P[E[0].b]));
     return r;
 };

	// functions to calculate network measures:
	// see: http://nbviewer.ipython.org/github/deep-introspection/My-Random-Notebooks/blob/master/Growing%20networks.ipynb
	function graphMetrics(P) {
		var G = new jsnx.Graph();
		for (i=0; i<P.length; i++) {
			G.addNodesFrom([i])
			for (j=0; j<P[i].n.length; j++) {
				G.addEdgesFrom([[i,P[i].n[j]]])
			}
		}
		// To draw:
		// jsnx.draw(G, {element: '#svg',  });
		// jsnx.shortestPathLength(i)._numberValues[i]._numberValues)
	$("#stats").html("<p>avg. clustering: "+jsnx.averageClustering(G).toFixed(4)+"</p>")
		return G;
	}

// function to animate growth
function animate() {
    
    // update smallest radius
    rad_minor=rad_minor*(1+(g/rad_minor));
    rad_major=rad_major*(1+(g/rad_major));
    //var new_rad_minor=Math.sqrt(Math.pow((skewx*new_rad*Math.cos(Math.PI/2)),2)+Math.pow((skewy*new_rad*Math.sin(Math.PI/2)),2))
    //var new_rad_major=Math.sqrt(Math.pow((skewx*new_rad*Math.cos(0)),2)+Math.pow((skewy*new_rad*Math.sin(0)),2))
    //var new_rad = lenvec(subvec(P[E[0].a],o)); 
    
    // break loop if flag is true or radius exceeds threshold
    if (rad_major>stoprad*rad || stopanimate==true) {			
        return P;
    } else {
        requestAnimationFrame(animate);
        for (i=0; i<E.length; i++) {
            // inserting new points if required 
            var l = lenvec(subvec(P[E[i].a], P[E[i].b])); // calculating edge length
            if (l>=2*r) {
                var newp=addvec(subvec(P[E[i].a],o), subvec(P[E[i].b],o)); // vector between neighbouring points
                var len_newp=lenvec(newp); // calculating length of new vector
                newp=mulvec(newp, 1/len_newp); // divide by length to  get only direction

                // calculate angle of new point via normalized vector
                theta_newp=Math.atan2(newp.y, newp.x)
                // calculate radius at the new point
                rad_newp=Math.sqrt(Math.pow((rad_major*Math.cos(theta_newp)),2)+Math.pow((rad_minor*Math.sin(theta_newp)),2))
                newp=mulvec(newp,rad_newp);  // multiply by radius at this angle

                newp=addvec(newp,o); // add origin
                newp.n=[]; // add empty neighbour lis
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
            pvec=mulvec(pvec, 1+(g/lenvec(pvec))); // make vector grow
            pvec=addvec(pvec, o); // add origin
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
    dist=parseFloat($("#dist").val());
    skew=parseFloat($("#skew").val());
    stopanimate=false;
    $("#svg").empty();
    P=[];
    E=[];
    P=initdot();
    E=initedge(P);
    r=rest(P,E);
    rad_minor=rad;
    rad_major=rad*skew;
    stopanimate=false;
    animate();
	$("#music")[0].play();
})

$("#stop").click(function(){
    stopanimate=true;
	$("#music")[0].pause();
})

$("#cont").click(function(){
    g=parseFloat($("#growth").val());
    ndot=parseFloat($("#nodes").val());
    prob=parseFloat($("#prob").val());
    dist=parseFloat($("#dist").val());
    skew=parseFloat($("#skew").val());
    stopanimate=false;
    animate();
	$("#music")[0].play();
});