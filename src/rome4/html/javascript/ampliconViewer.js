
var margins = {
    'win_t': 10,
    'win_b': 10,
    'win_l': 10,
    'win_r': 10,
    'subset_min_h': 100,
    'subset_L': 10,
    'subset_R': 10,
    'subset_row_pad': 10,
    'svg_L': 10,
    'svg_R': 10,
    'svg_T': 10,
    'svg_B': 10,
    'legend_w': 200,
    'legend_padW': 2,
    'legend_padH': 2,
    'legend_rowH': 20,
}

function init_controller(){
    var svg_hints = d3.select('div#display svg.sv_display').datum();
    var metadata_columns = Object.keys(svg_hints.specimen_metadata[0]);
    metadata_columns.unshift('None');
    var controller_div = d3.select("div#controller");

    controller_div.append('label')
        .attr('for', 'subset_by')
        .text(' Subset by: ');
    var subset_by_sel = controller_div.append('select')
    .attr('class', 'controller')
    .attr('id', 'subset_by');
    var subset_by_opt = subset_by_sel.selectAll('option')
    .data(metadata_columns);
    subset_by_opt.exit().remove();
    subset_by_opt.enter().append('option');
    var subset_by_opt = subset_by_sel.selectAll('option')
    subset_by_opt
    .attr('value', function(d){return d})
    .text(function(d){return d});
    subset_by_sel.property('value', svg_hints.hints.subset_by);

    controller_div.append('label')
    .attr('for', 'order_by')
    .text(' Order by: ');    
    var order_by_sel = controller_div.append('select')
        .attr('class', 'controller')
        .attr('id', 'order_by');
    var order_by_opt = order_by_sel.selectAll('option')
        .data(metadata_columns);
    order_by_opt.exit().remove();
    order_by_opt.enter().append('option');
    var order_by_opt = order_by_sel.selectAll('option')
    order_by_opt
        .attr('value', function(d){return d})
        .text(function(d){return d});
    order_by_sel.property('value', svg_hints.hints.order_by);

    controller_div.append('label')
        .attr('for', 'order_type')
        .text(" Order type: ");
    var order_type_sel = controller_div.append('select')
    .attr('class', 'controller')
    .attr('id', 'order_type');
    order_type_sel.append('option')
        .attr('value', 'categorical')
        .text("Categorical");
    order_type_sel.append('option')
        .attr('value', 'numerical')
        .text("Numerical");
    order_type_sel.property('value', svg_hints.hints.order_type);

    d3.selectAll('select.controller')
        .on('change', function(){
            resize();
            update();
        })
    
    d3.select(window).on('resize', function(){ 
        update();
    });
    tooltip_build();
    contextMenu_build();
    d3.selectAll('svg.sv_display')
        .on('contextmenu', function(){
            d3.event.preventDefault();
            contextMenu_activate(d3.select(this));
        });
}
 
function resize(){
    var win_w = $(window).width();
    var win_h = $(window).height();
    var controller_offset = $('div#controller').offset();
    var controller_height = $('div#controller').height();
    var status = get_controller_status();
    var display_div = d3.select('div#display');
    var div_w = win_w - margins.win_l - margins.win_r;
    var div_h = win_h - controller_offset.top - controller_height - margins.win_t - margins.win_b;
    display_div.style('width', div_w+"px");
    //display_div.style('height', div_h+"px");
    display_div.style('transform', 'translate('+margins.win_l+',0)');

    var subset_svg = display_div.select('svg.sv_display');
    var subset_g = subset_svg.selectAll('g.subset');
    // Now the SVG    
    var svg_width = (div_w - margins.svg_L - margins.svg_R - margins.legend_w );
    subset_svg
        .attr('width', svg_width)
        .attr('height', subset_g.size() * (margins.subset_min_h + margins.subset_row_pad)+ margins.svg_T + margins.svg_B)
        .attr('transform', 'translate('+margins.svg_L+','+margins.svg_T+')');

    var svg_hints = subset_svg.datum();
    var X_hints = svg_hints.subset_data.reduce(function(p,sub){
        if (sub.length > p.max_specimen_n) {
            p.max_specimen_n = sub.length
        }
        if (status.order_type == 'numerical') {
            var sp_x = sub.map(function(sp){ return parseFloat(sp.specimen_metadata[status.order_by]); });
            if (Math.min.apply(Math, sp_x) < p.min_X){
                p.min_X = Math.min.apply(Math, sp_x);
            }
            if (Math.max.apply(Math, sp_x) > p.max_X){
                p.max_X = Math.max.apply(Math, sp_x);
            }
        } else {
            var sp_x = sub.map(function(sp){ return parseFloat(sp.specimen_metadata[status.order_by]); });
            sp_x.forEach(item => p.possible_X.add(item));
        }


        return p;
    },{
        'max_specimen_n': 0,
        'min_X': 0,
        'max_X': 0,
        'possible_X': new Set()
    });    
    svg_hints['X_hints'] = X_hints;
    // Create an X-scale for the G and SVG.
    if (status.order_type == 'numerical'){
        var X_scale = d3.scaleLinear()
            .domain([svg_hints.X_hints.min_X, svg_hints.X_hints.max_X])
            .range([margins.subset_L, svg_width - margins.subset_L - margins.subset_R - 2*margins.legend_padW - margins.legend_w]);
    } else {
        var X_scale = d3.scaleBand()
            .domain(Array.from(svg_hints.X_hints.possible_X))
            .range([margins.subset_L, svg_width - margins.subset_L - margins.subset_R - 2*margins.legend_padW - margins.legend_w]);
        
    }
    svg_hints['X_scale'] = X_scale;
    subset_svg.datum(svg_hints);
    // Now the subset groups!
    
    subset_g
        .attr('height', margins.subset_min_h)
        .attr('transform', function(d, i){
            return 'translate('+0+','+(margins.subset_row_pad+i*(margins.subset_min_h+margins.subset_row_pad))+')';
        });
    
    // And the legend
    var legend_g = d3.select("g#legend");
    legend_g
        .attr('transform', 'translate('+(svg_width - margins.legend_w - 2*margins.legend_padW)+','+margins.svg_T+')')
        .attr('width', margins.legend_w);
    
    return [div_w, div_h];
}

function plot_subsets(){
    // Grab the svg_hints:
    var svg_hints = d3.select('svg.sv_display').datum();
    // Get the status
    var status = get_controller_status();

    // Grab the subset svg_g
    var subset_g = d3.selectAll('g.subset');
  
    if (status.order_type == 'numerical') {
        // Here we want to create a jump from specimen to specimen
        // Create groups for each specimen within each subset.
        var specimen_g = subset_g.selectAll('g.specimen').data(function(d, i){
            var ret_list = [];
            for (let i = 1; i < d.length; i++){
                ret_list.push({
                    left_d: d[i-1],
                    right_d: d[i]
                });
            }
            return ret_list;
        });
        specimen_g.exit().remove();
        specimen_g.enter().append('g')
            .attr('class', 'specimen');
        var specimen_g = subset_g.selectAll('g.specimen');
        specimen_g
            .attr('id', function(d){ return "SP_"+d.left_d.specimen_metadata.specimen+"__to__"+d.right_d.specimen_metadata.specimen; })
            .attr('transform', function(d){ 
                return 'translate('+svg_hints.X_scale(d.left_d.specimen_metadata[status.order_by])+','+0+')'
            })
            .attr('width', function(d){
                d['width'] = svg_hints.X_scale(d.right_d.specimen_metadata[status.order_by]) - svg_hints.X_scale(d.left_d.specimen_metadata[status.order_by]);
                return d['width'];
            });
        Y_scale = d3.scaleLinear()
            .domain([0, 1])
            .range([0, margins.subset_min_h]);
        // Finally the SV strips!

        // remove any rects
        specimen_g.selectAll('rect').remove();
        // Bind new data
        if (svg_hints.ordered_taxon == undefined) {
            var sv_poly = specimen_g.selectAll('polygon.sv')
                .data(function(d){
                    var y0 = 0;
                    var y1 = 0;

                    return svg_hints.svs.reduce(function(p, sv){
                        if (d.left_d.sv_fract[sv] != undefined){
                            var dy0 = d.left_d.sv_fract[sv]
                        } else {
                            var dy0 = 0;
                        }
                        if (d.right_d.sv_fract[sv] != undefined){
                            var dy1 = d.right_d.sv_fract[sv]
                        } else {
                            var dy1 = 0;
                        }
                        if ((dy0 != 0) || (dy1 != 0)) {
                            p.push({
                                'sv': sv,
                                'y0': y0,
                                'dy0': dy0,
                                'y1': y1,
                                'dy1': dy1,
                                'width': d.width
                            })
                        }
                        y0 += dy0;
                        y1 += dy1;
                        return p;
                    },[])
                    return [];
                });
            } else {
                var sv_poly = specimen_g.selectAll('polygon.sv')
                .data(function(d){
                    var y0 = 0;
                    var y1 = 0;

                    return svg_hints.ordered_taxon.reduce(function(p, t){
                        if (d.left_d.taxa_fract[t] != undefined){
                            var dy0 = d.left_d.taxa_fract[t] 
                        } else {
                            var dy0 = 0;
                        }
                        if (d.right_d.taxa_fract[t]  != undefined){
                            var dy1 = d.right_d.taxa_fract[t] 
                        } else {
                            var dy1 = 0;
                        }
                        if ((dy0 != 0) || (dy1 != 0)) {
                            p.push({
                                'sv': Array.from(svg_hints.taxa_sv[t])[0],
                                'taxon': t,
                                'y0': y0,
                                'dy0': dy0,
                                'y1': y1,
                                'dy1': dy1,
                                'width': d.width
                            })
                        }
                        y0 += dy0;
                        y1 += dy1;
                        return p;
                    },[])
                    return [];
                });                
            }
        sv_poly.exit().remove();
        sv_poly.enter().append('polygon')
            .attr('class', 'sv');
        sv_poly = specimen_g.selectAll('polygon.sv')
            .attr('class', function(d) { return 'sv '+d.sv.replace('-',"_").replace(" ", "_").replace(":", "_"); })
            .attr('points', function(d){
                return "0,"+Y_scale(d.y0)+" 0,"+Y_scale(d.y0+d.dy0)+" "+d.width+","+Y_scale(d.dy1+d.y1)+" "+d.width+","+Y_scale(d.y1);
            });
            var accent = d3.scaleOrdinal(d3.schemeAccent);
        sv_poly
            .style('fill', function(d){  return svg_hints.sv_metadata[d.sv].color; })
    } // end IF numerical / timeline
    else {
        var specimen_g = subset_g.selectAll('g.specimen').data(function(d){
            return d;
        });
        specimen_g.exit().remove();
        specimen_g.enter().append('g')
            .attr('class', 'specimen');
        var specimen_g = subset_g.selectAll('g.specimen');
        specimen_g
            .attr('id', function(d){ return "SP_"+d.specimen_metadata.specimen; })
            .attr('transform', function(d){ 
                return 'translate('+svg_hints.X_scale(d.specimen_metadata[status.order_by])+','+0+')'
            })
            .attr('width', function(d){
                d['width'] = svg_hints.X_scale.bandwidth();
                return d['width'];
            });
        // remove all polygons
        specimen_g.selectAll('polygon.sv').remove();
        Y_scale = d3.scaleLinear()
            .domain([0, 1])
            .range([0, margins.subset_min_h]);
        // Finally the SV bands
        if (svg_hints.ordered_taxon == undefined) {        
            var sv_band = specimen_g.selectAll('rect.sv')
                .data(function(d){
                    var y0 = 0;
                    return svg_hints.svs.reduce(function(p, sv){
                        if (d.sv_fract[sv] != undefined){
                            p.push({
                                'sv': sv,
                                'base': Y_scale(y0),
                                'height': Y_scale(d.sv_fract[sv]),
                                'width': svg_hints.X_scale.bandwidth()
                            });
                            y0 += d.sv_fract[sv];
                        }
                        return p;
                    }, []);

                });
        } else {
            var sv_band = specimen_g.selectAll('rect.sv')
                .data(function(d){
                    var y0 = 0;
                    return svg_hints.ordered_taxon.reduce(function(p, t){
                        if (d.taxa_fract[t] != undefined){
                            p.push({
                                'taxon': t,
                                'sv': Array.from(svg_hints.taxa_sv[t])[0],
                                'base': Y_scale(y0),
                                'height': Y_scale(d.taxa_fract[t]),
                                'width': svg_hints.X_scale.bandwidth()
                            });
                            y0 += d.taxa_fract[t];
                        }
                        return p;
                    }, []);

                });            
        }
        sv_band.exit().remove();
        sv_band.enter().append('rect')
            .attr('class', 'sv');
        var sv_band = specimen_g.selectAll('rect.sv')
            .attr('class', function(d){ return 'sv '+d.sv.replace('-',"_").replace(" ", "_").replace(":", "_")})
            .attr('height', function(d){ return d.height; })
            .attr('width', function(d){ return d.width;})
            .attr('transform', function(d){ return 'translate('+0+','+d.base+')'; })
            .style('fill', function(d){  return svg_hints.sv_metadata[d.sv].color; });
    }
    // regardless, activate the mouseover
    d3.selectAll('.sv').on('mouseover', function(d){ sv_activate(d.sv); });
    d3.selectAll('.sv').on('mouseout', function(d){ sv_deactivate(d.sv); });
}

function init_sv_colors() {
    var svg_hints = d3.select('svg.sv_display').datum();
    var sv_ids = svg_hints.svs;
    var sv_dict = sv_ids.reduce(function(p, sv_id, i){
        p[sv_id] = {
            'color': d3.interpolateSinebow(i / sv_ids.length)
        }
        return p;
    }, {});
    svg_hints['sv_metadata'] = sv_dict;
}

function change_resolution(){
    // Goal here is to create an ordered SV list
    // and update to the SV metadata
    // The display engines can then take it from there
    var controller_div = d3.select('div#controller');
    var data = d3.select('svg.sv_display').datum();
    var status = get_controller_status();
    var target_resolution = status.want_rank;
    var sv_tax_dict = data.sv_tax_dict;

    if (target_resolution  == 'sequence variant'){
        init_sv_colors();
        data.ordered_taxon = undefined;
    } else {

        function recursive_group(sv_ids, end_target_rank_i, cur_target_rank_i) {
            cur_target_rank = data.classification.want_ranks_in_order[cur_target_rank_i];
            var groups = sv_ids.reduce(function(groups, sv_id){
                var sv_tax_id = data.classification.sv_taxonomy[classifier][cur_target_rank][sv_id];
                if (!(sv_tax_id in groups)){
                    groups[sv_tax_id] = [];
                }
                groups[sv_tax_id].push(sv_id);
                return groups;
            }, {});

            if (end_target_rank_i === cur_target_rank_i){
                return Object.keys(groups).sort().reduce(function(ordered_sv, tax_id){
                    return ordered_sv.concat(groups[tax_id]);
                }, []);
            } else {
                return Object.keys(groups).sort().reduce(function(ordered_sv, tax_id){
                    return ordered_sv.concat(
                        recursive_group(
                            groups[tax_id],
                            end_target_rank_i,
                            cur_target_rank_i-1
                        ));
                }, []);
            }
        }

        function recursive_group_and_color(
                                    sv_ids,
                                    ordered_ranks,
                                    sv_tax_dict,
                                    end_target_rank_i,
                                    cur_target_rank_i,
                                    color_scheme,
                                    spectrum,
                                    spectrum_L,
                                    spectrum_H,
                                    ) {
            cur_target_rank = ordered_ranks[cur_target_rank_i];
            var groups = sv_ids.reduce(function(groups, sv_id){
                var sv_tax_id = sv_tax_dict[cur_target_rank][sv_id];
                if (!(sv_tax_id in groups)){
                    groups[sv_tax_id] = [];
                }
                groups[sv_tax_id].push(sv_id);
                return groups;
            }, {});

            if (end_target_rank_i === cur_target_rank_i){
                // Figure out how to divide up this current spectrum
                // How many of the tax IDS at this rank are NOT in the color scheme themselves?
                var spectra_n = Object.keys(groups).reduce(function(p, tax_id){
                    if (!(tax_id in color_scheme)) { p.push(tax_id); }
                    return p;
                },[]).length;
                // Spectra range / num is the slice size
                var spectra_slice_size = (spectrum_H - spectrum_L) / (spectra_n);
                var spectra_slice_n = 0;

                return Object.keys(groups).sort().reduce(function(ordered_sv, tax_id){
                    if (tax_id in color_scheme){
                        var group_spectrum = tax_id;
                        spectrum_L = 0.0;
                        spectrum_H = 1.0;
                        var tax_spectra_range = [
                            0.0,
                            1.0
                        ];
                    } else {
                        var group_spectrum = spectrum;
                        var tax_spectra_range = [
                            spectrum_H - (spectra_slice_n+1)*spectra_slice_size,
                            spectrum_H - spectra_slice_n*spectra_slice_size,
                        ];
                        spectra_slice_n += 1;
                    }

                    var group_color = d3.interpolateCubehelix.gamma(3)
                                        (color_scheme[group_spectrum][0], color_scheme[group_spectrum][1])
                                        ((tax_spectra_range[1] - tax_spectra_range[0]) / 2 + tax_spectra_range[0]);

                    if (data.taxa[tax_id] != undefined) {
                        var group_tax_name = data.taxa[tax_id].tax_name;
                        var group_tax_rank = data.taxa[tax_id].rank;
                    } else {
                        
                        var group_tax_name = 'unknown';
                        var group_tax_rank = 'unknown';
                    }
                    groups[tax_id].forEach(function(sv_id){
                        data.sv_metadata[sv_id]['color'] = group_color;
                        data.sv_metadata[sv_id]['tax_id'] = tax_id;
                        data.sv_metadata[sv_id]['name'] = group_tax_name;
                        data.sv_metadata[sv_id]['rank'] = group_tax_rank;
                    });
                    if (!(tax_id in data.taxa)) {
                        data.taxa[tax_id] = {
                            'tax_name': group_tax_name,
                            'tax_id': tax_id,
                            'rank': group_tax_rank,
                        }
                    }
                    data.taxa[tax_id]['color'] = group_color;
                    
                    return ordered_sv.concat(groups[tax_id]);
                }, []);
            } else {
                // Figure out how to divide up this current spectrum
                // How many of the tax IDS at this rank are NOT in the color scheme themselves?
                var spectra_n = Object.keys(groups).reduce(function(p, tax_id){
                    if (!(tax_id in color_scheme)) { p.push(tax_id); }
                    return p;
                },[]).length;
                // Spectra range / num is the slice size
                var spectra_slice_size = (spectrum_H - spectrum_L) / (spectra_n);
                var spectra_slice_n = 0;                    

                return Object.keys(groups).sort().reduce(function(ordered_sv, tax_id, i){
                    if (tax_id in color_scheme){
                        var group_spectrum = tax_id;
                        var tax_spectra_range = [
                            0.0,
                            1.0,
                        ];
                    }
                    else {
                        var group_spectrum = spectrum;
                        var tax_spectra_range = [
                            spectrum_H - (spectra_slice_n+1)*spectra_slice_size,
                            spectrum_H - spectra_slice_n*spectra_slice_size
                        ];
                        spectra_slice_n += 1;

                    }
                    return ordered_sv.concat(
                        recursive_group_and_color(
                            groups[tax_id],
                            ordered_ranks,
                            sv_tax_dict,
                            end_target_rank_i,
                            cur_target_rank_i-1,
                            color_scheme,
                            group_spectrum,
                            0, //tax_spectra_range[0],
                            1, //tax_spectra_range[1],
                        ));
                }, []);
            }
        }
        // color schemes are a nested dict format
        // first key is the tax_id where this color scheme should start
        // value is an array of colors to range between. 
        // Nice to include a default as well 
        var color_scheme = {
            '1239': ['#dadaeb', '#3f007d'],  // firmucutes (P) -> purple  
            '976': ['#fefbf3', '#f4cd65'],  // Bacteroides -> yellows  
            '186803': ['#8c96c6', '#4d004b'],  // Lachno (F) -> Blue-purple 
            '1224': ['#fff5f0', '#ffc2a4'],  // Proteobacteria (P) -> Corals
            '201174': ['#deebf7', '#9ecae1'], // Actinobacteria (P) -> Teal
            '32066': ['#ef3b2c', '#a50f15'],  // Fusobacteria (P) -> Red
            'default': ['#d9d9d9', '#252525'],  // Greys 
        }
        var ordered_sv = recursive_group_and_color(
            data.svs,
            data.want_ranks_in_order,
            sv_tax_dict,
            data.want_ranks_in_order.indexOf(target_resolution),
            data.want_ranks_in_order.length - 2,
            color_scheme,
            'default',
            0.0,
            1.0,
        );
        data.svs = ordered_sv;
    } // end else not seq

    // Now make a reverse mapping of taxa to SV
    var sv_tax = data.sv_tax_dict[status.want_rank];
    if (sv_tax != undefined){
        // first map taxa (at want_rank) to SV
        data.taxa_sv = Object.keys(sv_tax).reduce(function(p,sv){
            if (!(sv_tax[sv] in p)) {
                p[sv_tax[sv]] = new Set([sv]);
            } else {
                p[sv_tax[sv]].add(sv);
            }
            return p;
        }, {}); 

        // ordered taxons from ordered_sv
        data.ordered_taxon =ordered_sv.reduce(function(p, sv){
            if (p.indexOf(sv_tax[sv]) == -1){
                p.push(sv_tax[sv]);
            } 
            return p;
        }, []);

        data.subset_data.forEach(function(subset){
            subset.forEach(function(sample){
                sample['taxa_fract'] = {};
                Object.keys(data.taxa_sv).forEach(
                    function(t){
                        sample['taxa_fract'][t] = Object.keys(sample.sv_fract).reduce(function(p, sv){
                            if (data.taxa_sv[t].has(sv)) {
                                p += sample.sv_fract[sv];
                            }
                            return p;
                        }, 0);
                    })
            })
        });

    }
    // And sum up fract by sv
    update();
}

function update_legend(){
    var legend_g = d3.select('svg.sv_display g#legend');
    var data = d3.select("div#display svg").datum();
    if (data.taxa_sv == undefined){
        return;
    }
    var taxa_mean_fract = Object.keys(data.taxa_sv).map(function(taxon){
        return {
            'taxon': taxon,
            'mean_ra': data.subset_data.reduce(function(p, subset){
            p += subset.reduce(function(sp, sample){
                sp += sample.taxa_fract[taxon];
                return sp;
            }, 0) / subset.length
            return p;
        }, 0) / data.subset_data.length
        }
    }).sort(function(a, b){  return b.mean_ra - a.mean_ra });

    var legend_rowg = legend_g.selectAll('g.legend_row')
        .data(taxa_mean_fract);
    legend_rowg.exit().remove();
    legend_rowg.enter().append('g')
        .attr('class', 'legend_row');
    var legend_rowg = legend_g.selectAll('g.legend_row')
    legend_rowg
        .attr('transform', function(d, i){ 
            return 'translate('+margins.legend_padW+','+(margins.legend_rowH*i + margins.legend_padH)+')';
        });
    var legend_colorrect = legend_rowg.selectAll('rect.legend_color')
        .data(function(d){ 
            d['color'] = data.sv_metadata[Array.from(data.taxa_sv[d.taxon].values())[0]]['color'];
            return [d];
         });
    legend_colorrect.exit().remove();
    legend_colorrect.enter().append('rect')
         .attr('class', 'legend_color');
    var legend_colorrect = legend_rowg.selectAll('rect.legend_color');
    legend_colorrect
         .attr('width', margins.legend_rowH - margins.legend_padW)
         .attr('height', margins.legend_rowH - margins.legend_padH)
         .style('fill', function(d){return d.color; });
    
    var legend_labels = legend_rowg.selectAll('text.legend_label')
         .data(function(d){
            d['tax_name'] = data.sv_metadata[Array.from(data.taxa_sv[d.taxon].values())[0]]['name'];
            return [d];
         })
    legend_labels.exit().remove();
    legend_labels.enter().append('text')
         .attr('class', 'legend_label');
    var legend_labels = legend_rowg.selectAll('text.legend_label');
    legend_labels
         .attr('x', margins.legend_rowH + margins.legend_padW)
         .attr('y', margins.legend_rowH - 2*margins.legend_padH)
         .style('font-size', margins.legend_rowH*.75+'px')
         .text(function(d){ return d.tax_name; });

    
    
}

function get_controller_status(){
    // Resolution, Group By, Order By, and Display
    var return_arr = {};
    return_arr['want_rank'] = $('div#controller select#want_rank').val() || "sequence variant";
    return_arr['subset_by'] = $('div#controller select#subset_by').val() || "None";
    return_arr['order_by'] = $('div#controller select#order_by').val() || "None";
    return_arr['order_type'] = $('div#controller select#order_type').val() || "None";

    return return_arr;
}

function sv_activate(sv) {
    var data = d3.select("div#display svg").datum();
    var status = get_controller_status();

    // Get the taxon / lineage of the sv
    var sv_tax = data.sv_taxonomy.reduce(function(p,c){
        if (c.sv == sv){
            p.push(c);
        }
        return p;
    }, []).sort(function(a, b){ return parseInt(b.rank_depth) - parseInt(a.rank_depth) ; });
    if (status.want_rank == 'sequence variant'){

        var tax_name = sv_tax[0].tax_name
    } else {
        var tax_name = sv_tax.reduce(function (p, c){
            if (c.want_rank == status.want_rank){
                p = c.tax_name;
            }
            return p;
        }, "");
    }
    tooltip_activate(tax_name);
    
    var sv_clean = sv.replace('-',"_").replace(" ", "_").replace(":", "_");
    d3.select("."+sv_clean)
        .style('stroke', 'black')
        .style('stroke-width', 1);
}

function sv_deactivate(sv) {
    var sv_clean = sv.replace('-',"_").replace(" ", "_").replace(":", "_");
    d3.select("."+sv_clean)
        .style('stroke', 'None')
        .style('stroke-width', 0);
    tooltip_deactivate();
}

function update(){
    resize();
    plot_subsets();
    update_legend();

}