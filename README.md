# ROME: Repository of Microbiome Experiments

## Purpose

 This is a small (python-based) command-line utility that takes the outputs from a microbiome analysis, now only [MaLiAmPi](https://github.com/jgolob/maliampi), and converts them into a small web-based visualizer. When hosted on a web server (including the lightweight python web server, `python -m SimpleHTTPServer`) you can quickly and easily explore the results of the experiment.

## Installation

(*Eventually*)
`pip3 install rome4`

or directly from the github repo:
```
git clone https://github.com/jgolob/rome4
cd rome4
pip3 install .
```

 ## Usage

```
usage: rome4 [-h] -out OUTPUT_PATH -svl SV_LONG -svt SV_TAXONOMY -M METADATA [-D DISPLAY_BY] [-S SUBSET_BY] [-O ORDER_BY] [-OT {numerical,categorical}]

A utility to build a javascript-based visualizer for microbiome data

optional arguments:
  -h, --help            show this help message and exit
  -out OUTPUT_PATH, --output-path OUTPUT_PATH
                        Path where to place outputs (required)
  -svl SV_LONG, --sv-long SV_LONG
                        Sequence varant <-> specimen <-> nreads in csv format (required)
  -svt SV_TAXONOMY, --sv-taxonomy SV_TAXONOMY
                        Sequence variant <-> taxonomy in long format (required)
  -M METADATA, --metadata METADATA
                        Specimen metadata in csv format (Required)
  -D DISPLAY_BY, --display-by DISPLAY_BY
                        Metadata column to group specimens by (default None)
  -S SUBSET_BY, --subset-by SUBSET_BY
                        Metadata column to subset specimens by (default None)
  -O ORDER_BY, --order-by ORDER_BY
                        Metadata column to order specimens by (default "specimen")
  -OT {numerical,categorical}, --order-type {numerical,categorical}
                        Is the order variable numerical or categorical? Default: categorical
```
### Output:

- `-out` or `--output-path`: Base path (directory) into which to place the html, javascript, css and data files.

### Data inputs:

- `-svl` or `--sv-long`: Path to a CSV file with the specimen - sequence variant - counts data (in long format). This CSV file should have a header with at least three columns:
    - `specimen` The unique specimen identifier, preferably without special characters or spaces
    - `sv` The sequence variant ID.
    - `count` or `nreads` Number of reads from that sequence variant in that specimen. 
- `-svt` or `--sv-taxonomy`: Path to a CSV file with the taxonomic decoration for each sequence variant. Should these columns:
    - `sv`: Sequence variant ID (corresponding to that in the `--sv-long` file).
    - `want_rank`: Taxonomic resolution desired
    - `rank`: Taxonomic resolution achieved.
    - `tax_name`: Taxon name at that rank
    - `ncbi_tax_id`: [NCBI taxonomy](https://ncbi.nlm.nih.gov/taxonomy) unique ID for this taxon
- `-M` or `--metadata`: CSV file with metadata for each specimen in a row. Should have a header with at least a `specimen` column, corresponding to the specimens in `--sv-long`

### Hints for Display:

- `-O` or `--order-by`: column in the `--metadata` csv file to be used to order the specimens, in essence the X-axis (where the microbiome data is the Y-axis). This can be categorical *or* numerical.

- `-OT` or `--order-type`: Either `numerical` or `categorical` based on the type of data in the `--order-by` column. Default is `categorical`. 

- `-D` or `--display-by`: A column in the `--metadata` csv file to be used to split up the data. For each value in this column a figure will be generated. For small studies all of the data can be in one figure. For larger studies, think about using something like participant ID (for longitudinal studies with repeated sampling).

- `-S` or `--subset-by`:  column in the `--metadata` csv file to be used to subset the data *within* a figure. The X-axis (order-by) will be shared for all subsets. This is intended for replicates (same conditions same materials sampled again). For simplier studies, this can be the same value for all specimens.

