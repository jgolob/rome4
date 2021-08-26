function save_svg(svg, cssLink){
        /*      Goal: Spit out the SVG for a figure such that it can be saved, opened in illustrator et al. 
         *      Input:
         *              svg: a D3 svg object.
         *              cssLink: a link to a CSS file to style (optional)
         *      Output: A new browser window with the SVG to be saved
         */
       
        var svg_html = svg.html();
        
        var docType = "<?xml version='1.0' standalone='no'?><!DOCTYPE svg PUBLIC '-//W3C//DTD SVG 1.1//EN' 'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd'>";
    
        var style_html = d3.selectAll('style').html();
        
        if (typeof(cssLink)!= 'undefined') { // If we got at CSS link.... 
                // Load the relevant CSS, and embed it into the XML of our figure's SVG
                
                
                d3.xhr(cssLink,'text/css',function(error, data){
                        // get the css file's contents
                        var cssText = data.response;
                        // Add it to our page's style section content
                        style_html = style_html+cssText;
                        
                        var containedStyle = "<defs><style type='text/css'><![CDATA["+style_html+"]]></style></defs>";
                        
                        var content = docType+"<svg xmlns='http://www.w3.org/2000/svg' height='"+svg.style('height')+"' width='"+svg.style('width')+"' >"
                                        +containedStyle+svg_html+"</svg>";
                        
                        // Have to get rid of generic font references for illustrator. :/
                        content = content.replace(/sans-serif/g,'arial');
                        
                        var uriContent = "data:image/svg+xml," + encodeURIComponent(content);
                        var link = document.createElement("a");
                        link.setAttribute("href", uriContent);
                        link.setAttribute("download", "figure.svg");
                        document.body.appendChild(link); // Required for FF
                        link.click();
                        link.parentNode.removeChild(link);                                           
                });
                
        }
        else { // no outside CSS
                
                var containedStyle = "<defs><style type='text/css'><![CDATA["+style_html+"]]></style></defs>";
                
                var content = docType+"<svg xmlns='http://www.w3.org/2000/svg' height='"+svg.style('height')+"' width='"+svg.style('width')+"' >"
                                +containedStyle+svg_html+"</svg>";
                
                // Have to get rid of generic font references for illustrator. :/
                content = content.replace(/sans-serif/g,'arial');
                var uriContent = "data:image/svg+xml," + encodeURIComponent(content);
                var link = document.createElement("a");
                link.setAttribute("href", uriContent);
                link.setAttribute("download", "figure.svg");
                document.body.appendChild(link); // Required for FF
                link.click();
                link.parentNode.removeChild(link);

        }
        
    }


function contextMenu_activate(svg, cssLink) {
        var contextMenu_div = d3.select('div#contextMenu_div');

        contextMenu_div
                .style('top',(d3.event.pageY)+'px')
                .style('left',(d3.event.pageX)+'px')
                .style('visibility','visible');
        
        contextMenu_div.select('a#download')
                .on('click',function(){
                        d3.event.preventDefault();
                        save_svg(svg, cssLink);
                        contextMenu_div.style('visibility','hidden');
                    });
}

function contextMenu_build(){
      var contextMenu_div = d3.select('body')
            .append('div')
                .attr('id','contextMenu_div')
                .style("position", "absolute")
                .style("z-index", "10")
               .style("visibility", "hidden")
                .style("background",'white')
                .style('border','solid black')
                .style('padding','4px');
                
        var ul = contextMenu_div.append('ul')
                .attr('class','menu');
                
        ul.append('li').append('a')
                .attr('id','download')
                .attr('class', 'menu')
                .text('Download Figure (as SVG)');
                
        ul.append('li').append('a')
                .attr('id','close')
                .attr('class', 'menu')
                .text('Close Menu')
                .on('click',function(){
                        contextMenu_div.style('visibility','hidden');        
                })
        
        
}
