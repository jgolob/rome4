import sys
import shutil
import os
from pathvalidate import sanitize_filename
import pandas as pd
import json
import logging
import argparse

logging.basicConfig(
    format='%(message)s',
    level=logging.INFO)
log = logging.getLogger(__name__)

class ROME4():
    def __init__(
        self,
        sv_long,
        sv_tax=None,
        metadata=None,
        template_dir='../../html/'
    ):
        self.__load_svl__(sv_long)
        self.__template_dir=template_dir
        
        if sv_tax is not None:
            self.__load_svtax__(sv_tax)
            log.info("Loading Taxonomy")
        else:
            self.__sv_taxonomy__ = None
                        
        if metadata is not None:
            self.__load_metadata__(metadata)
        else:
            self.__metadata__ = None
        
        log.info("There are {:,d} specimens and {:,d} sequence variants".format(
            len(self.__sv_long__.specimen.unique()),
            len(self.__sv_long__.sv.unique())
        ))
    
    def __load_svl__(self, svl_h):
        svl_raw = pd.read_csv(svl_h)
        svl_raw.rename({'count': 'nreads'}, axis=1, inplace=True)
        assert 'specimen' in svl_raw.columns
        assert 'sv' in svl_raw.columns
        assert 'nreads' in svl_raw.columns
        svl = pd.merge(
            svl_raw,
            svl_raw.groupby('specimen').sum().rename({'nreads': 'total_reads'}, axis=1),
            left_on='specimen',
            right_index=True,
            how='left'
        )
        svl['fract'] = svl['nreads'] / svl['total_reads']
        self.__sv_long__ = svl.copy()
        return self.__sv_long__
    
    def __load_svtax__(self, sv_tax_h):
        sv_tax = pd.read_csv(sv_tax_h)
        sv_tax.rename({'name': 'sv'}, axis=1, inplace=True)
        
        assert (len({
            'sv',
            'want_rank',
            'rank',
            'tax_name',
            'ncbi_tax_id'
        } - set(sv_tax.columns)) == 0), "Invalid sv-taxonomy file provided"
        
        if len(set(self.__sv_long__.sv) - set(sv_tax.sv)) > 0:
            log.warning("Taxonomy loaded, but {:,d} of {:,d} sequence variants do not have taxonomy in this file".format(
                len(set(self.__sv_long__.sv) - set(sv_tax.sv)),
                len(set(self.__sv_long__.sv))
            ))
        
        self.__sv_taxonomy__ = sv_tax.copy()

    def __load_metadata__(self, metadata_h):
        metadata = pd.read_csv(metadata_h)
        
        assert 'specimen' in metadata.columns
        if len(set(self.__sv_long__.specimen) - set(metadata.specimen)) > 0:
            log.warning("Metadata loaded, but {:,d} of {:,d} specimens were not included".format(
                len(set(self.__sv_long__.specimen) - set(metadata.specimen)),
                len(set(self.__sv_long__.specimen))
            ))
        self.__metadata__ = metadata.copy()
    
    def to_dict(self, major_group=None, minor_group=None, order_var=None):
        out_dict = {
            'svl': self.__sv_long__.to_dict('records'),
        }
        if self.__sv_taxonomy__ is not None:
            out_dict['sv_taxonomy'] = self.__sv_taxonomy__.to_dict('records')
        if self.__metadata__ is not None:
            out_dict['metadata'] = self.__metadata__.to_dict('records')
            if major_group:
                assert major_group in self.__metadata__.columns, "{} not in metadata".format(major_group)
                out_dict['major_group'] = major_group
            if minor_group:
                if not major_group:
                    log.warning("Minor group variable wihtout a major group variable")
                assert minor_group in self.__metadata__.columns, "{} not in metadata".format(minor_group)
                out_dict['minor_group'] = minor_group
            if order_var:
                assert order_var in self.__metadata__.columns, "{} not in metadata".format(order_var)
                out_dict['order_var'] = order_var
        elif order_var or major_group or minor_group:
            log.warning("Provided grouping or ordering variables and no metadata. These will be ignored")
        
        return out_dict
    
    def output(self, base_dir, display_by=None, subset_by=None, order_by=None, order_type='categorical'):
        try:
            os.makedirs(
                os.path.join(
                    base_dir,
                    'data',
                )
            )
        except FileExistsError:
            pass
        # Move the core templates
        try:
            shutil.copyfile(
                os.path.join(self.__template_dir, 'index.html'),
                os.path.join(base_dir, 'index.html')
            )
        except FileExistsError:
            pass
        try:
            shutil.copytree(
                os.path.join(self.__template_dir, 'javascript', ),
                os.path.join(base_dir, 'javascript')
            )
        except FileExistsError:
            pass
        try:
            shutil.copytree(
                os.path.join(self.__template_dir, 'css', ),
                os.path.join(base_dir, 'css')
            )
        except FileExistsError:
            pass
        # Output the hints
        json.dump(
            {
                'display_by': display_by,
                'subset_by': subset_by,
                'order_by': order_by,
                'order_type': order_type,
            },
            open(
                os.path.join(base_dir, 'data', 'hints.json'),
                'wt'
            )
        )

        # Output the entire data
        self.__sv_long__.to_csv(
            os.path.join(base_dir, 'data', 'svl.csv'),
            index=None
        )
        self.__metadata__.to_csv(
            os.path.join(base_dir, 'data', 'specimen_metadata.csv'),
            index=None
        )
        self.__sv_taxonomy__.to_csv(
            os.path.join(base_dir, 'data', 'sv_taxonomy.csv'),
            index=None
        )

        # Now onto the groups
        group_path = {}
        for group, g_md in self.__metadata__.groupby(display_by):
            group_basedir = os.path.join(base_dir, 'group', sanitize_filename(str(group)))
            group_path[group] = os.path.join('group', sanitize_filename(str(group)), "")
            try:
                os.makedirs(group_basedir)
            except FileExistsError:
                pass    
            # Subset
            g_specimens = set(g_md.specimen)
            g_svl = self.__sv_long__[
                self.__sv_long__.specimen.apply(lambda sp: sp in g_specimens)
            ]
            g_sv = set(g_svl.sv)
            g_sv_tax = self.__sv_taxonomy__[
                self.__sv_taxonomy__.sv.apply(lambda sv: sv in g_sv)
            ]
            # And output
            g_md.to_csv(
                os.path.join(group_basedir, 'specimen_metadata.csv'),
                index=None
            )
            g_svl.to_csv(
                os.path.join(group_basedir, 'svl.csv'),
                index=None
            )
            g_sv_tax.to_csv(
                os.path.join(group_basedir, 'sv_taxonomy.csv'),
                index=None
            )
            try:
                shutil.copy(
                    os.path.join(self.__template_dir, 'group', "index.html"),
                    os.path.join(group_basedir, 'index.html')
                )
            except FileExistsError:
                pass

def main():
    parser = argparse.ArgumentParser(
        description="""A utility to build a javascript-based visualizer for microbiome data
        """
    )
    parser.add_argument(
        '-out', '--output-path',
        help='Path where to place outputs (required)',
        required=True
    )
    parser.add_argument(
        '-svl', '--sv-long',
        help='Sequence varant <-> specimen <-> nreads in csv format (required)',
        required=True
    )
    parser.add_argument(
        '-svt', '--sv-taxonomy',
        help='Sequence variant <-> taxonomy in long format (required)',
        required=True
    )
    parser.add_argument(
        '-M', '--metadata',
        help='Specimen metadata in csv format (Required)',
        required=True
    )    
    parser.add_argument(
        '-D', '--display-by',
        help='Metadata column to group specimens by (default None)',
        default=None
    )
    parser.add_argument(
        '-S', '--subset-by',
        help='Metadata column to subset specimens by (default None)',
        default=None
    )
    parser.add_argument(
        '-O', '--order-by',
        help='Metadata column to order specimens by (default "specimen")',
        default='specimen'
    )
    parser.add_argument(
        '-OT', '--order-type',
        help='Is the order variable numerical or categorical? Default: categorical',
        choices=(
            'numerical',
            'categorical'
        ),
        default='categorical'
    )
    args = parser.parse_args()
    rome4 = ROME4(
        sv_long=args.sv_long,
        sv_tax=args.sv_taxonomy,
        metadata=args.metadata
    )
    rome4.output(
        base_dir=args.output_path,
        display_by=args.display_by,
        subset_by=args.subset_by,
        order_by=args.order_by,
        order_type=args.order_type
    )

if __name__ == '__main__':
    main()