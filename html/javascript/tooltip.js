
function tooltip_build() {

        // This is a little tooltip div used to hover the taxon names
    var tooltip = d3.select("body")
        .append("div")
        .attr('id','tooltip')
        .style("position", "absolute")
        .style("z-index", "10")
        .style("visibility", "hidden")
        .style("background",'white')
        .style("opacity", 0.9)
        .text("");
}

function tooltip_activate(text){
    var tooltip = d3.select('div#tooltip');
    tooltip
        .style('left', (d3.event.pageX + 10)+"px")
        .style('top', (d3.event.pageY + 10)+"px")
        .style('visibility', 'visible')
        .text(text);
}

function tooltip_deactivate(){
    var tooltip = d3.select('div#tooltip');
    tooltip
        .style('visibility', 'hidden')
        .text("");   
}