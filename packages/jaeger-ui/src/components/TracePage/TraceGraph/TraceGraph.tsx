// Copyright (c) 2018 The Jaeger Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as React from 'react';
import { Card, Button, Tooltip } from 'antd';
import { IoClose, IoHelpCircleOutline } from 'react-icons/io5';
import cx from 'classnames';
import { Digraph, LayoutManager, cacheAs } from '@jaegertracing/plexus';

import {
  getNodeRenderer,
  getNodeFindEmphasisRenderer,
  renderNodeVectorBorder,
  MODE_SERVICE,
  MODE_TIME,
  MODE_SELFTIME,
  HELP_TABLE,
} from './OpNode';
import { TEv, TSumSpan } from './types';
import { TDenseSpanMembers } from '../../../model/trace-dag/types';
import TDagPlexusVertex from '../../../model/trace-dag/types/TDagPlexusVertex';
import { TNil } from '../../../types';
import { TraceGraphConfig } from '../../../types/config';

import './TraceGraph.css';

type Props = {
  headerHeight: number;
  ev?: TEv | TNil;
  uiFind: string | TNil;
  uiFindVertexKeys: Set<string> | TNil;
  traceGraphConfig?: TraceGraphConfig;
};
type State = {
  showHelp: boolean;
  mode: string;
};

const { classNameIsSmall, scaleOpacity, scaleStrokeOpacity } = Digraph.propsFactories;

export function setOnEdgePath(e: any) {
  return e.followsFrom ? { strokeDasharray: 4 } : {};
}

const HELP_CONTENT = (
  <div className="TraceGraph--help-content" data-testid="help-content">
    {HELP_TABLE}
    <div>
      <table>
        <tbody>
          <tr>
            <td>
              <Button htmlType="button" shape="circle" size="small">
                S
              </Button>
            </td>
            <td>Service</td>
            <td>Colored by service</td>
          </tr>
          <tr>
            <td>
              <Button htmlType="button" shape="circle" size="small">
                T
              </Button>
            </td>
            <td>Time</td>
            <td>Colored by total time</td>
          </tr>
          <tr>
            <td>
              <Button htmlType="button" shape="circle" size="small">
                ST
              </Button>
            </td>
            <td>Selftime</td>
            <td>Colored by self time (*)</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div>
      <svg width="100%" height="40">
        <line x1="0" y1="10" x2="90" y2="10" style={{ stroke: '#000', strokeWidth: 2 }} />
        <text alignmentBaseline="middle" x="100" y="10">
          ChildOf
        </text>
        <line
          x1="0"
          y1="30"
          x2="90"
          y2="30"
          style={{ stroke: '#000', strokeWidth: 2, strokeDasharray: '4' }}
        />
        <text alignmentBaseline="middle" x="100" y="30">
          FollowsFrom
        </text>
      </svg>
    </div>
    <div>
      (*) <b>Self time</b> is the total time spent in a span when it was not waiting on children. For example,
      a 10ms span with two 4ms non-overlapping children would have <b>self-time = 10ms - 2 * 4ms = 2ms</b>.
    </div>
  </div>
);

export default class TraceGraph extends React.PureComponent<Props, State> {
  state: State;

  layoutManager: LayoutManager;

  static defaultProps = {
    ev: null,
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      showHelp: false,
      mode: MODE_SERVICE,
    };
    this.layoutManager = new LayoutManager({
      totalMemory: props.traceGraphConfig?.layoutManagerMemory,
      useDotEdges: true,
      splines: 'polyline',
    });
  }

  componentWillUnmount() {
    this.layoutManager.stopAndRelease();
  }

  toggleNodeMode(newMode: string) {
    this.setState({ mode: newMode });
  }

  showHelp = () => {
    this.setState({ showHelp: true });
  };

  closeSidebar = () => {
    this.setState({ showHelp: false });
  };

  render() {
    const { ev, headerHeight, uiFind, uiFindVertexKeys } = this.props;
    const { showHelp, mode } = this.state;
    if (!ev) {
      return <h1 className="u-mt-vast u-tx-muted ub-tx-center">No trace found</h1>;
    }

    const wrapperClassName = cx('TraceGraph--graphWrapper', { 'is-uiFind-mode': uiFind });

    return (
      <div className={wrapperClassName} style={{ paddingTop: headerHeight + 47 }}>
        <Digraph<TDagPlexusVertex<TSumSpan & TDenseSpanMembers>>
          minimap
          zoom
          className="TraceGraph--dag"
          minimapClassName="u-miniMap"
          layoutManager={this.layoutManager}
          measurableNodesKey="nodes"
          layers={[
            {
              key: 'node-find-emphasis',
              layerType: 'svg',
              renderNode: getNodeFindEmphasisRenderer(uiFindVertexKeys),
            },
            {
              key: 'edges',
              edges: true,
              layerType: 'svg',
              defs: [{ localId: 'arrow' }],
              markerEndId: 'arrow',
              setOnContainer: [scaleOpacity, scaleStrokeOpacity],
              setOnEdge: setOnEdgePath,
            },
            {
              key: 'nodes-borders',
              layerType: 'svg',
              setOnContainer: scaleStrokeOpacity,
              renderNode: renderNodeVectorBorder,
            },
            {
              key: 'nodes',
              layerType: 'html',
              measurable: true,
              renderNode: cacheAs(`trace-graph/nodes/render/${mode}`, getNodeRenderer(mode)),
            },
          ]}
          setOnGraph={classNameIsSmall}
          edges={ev.edges}
          vertices={ev.vertices}
        />
        <a
          className="TraceGraph--experimental"
          href="https://github.com/jaegertracing/jaeger-ui/issues/293"
          target="_blank"
          rel="noopener noreferrer"
        >
          Experimental
        </a>
        <div className="TraceGraph--sidebar-container">
          <ul className="TraceGraph--menu">
            <li>
              <IoHelpCircleOutline onClick={this.showHelp} data-testid="help-icon" />
            </li>
            <li>
              <Tooltip placement="left" title="Service">
                <Button
                  className="TraceGraph--btn-service"
                  htmlType="button"
                  shape="circle"
                  size="small"
                  onClick={() => this.toggleNodeMode(MODE_SERVICE)}
                >
                  S
                </Button>
              </Tooltip>
            </li>
            <li>
              <Tooltip placement="left" title="Time">
                <Button
                  className="TraceGraph--btn-time"
                  htmlType="button"
                  shape="circle"
                  size="small"
                  onClick={() => this.toggleNodeMode(MODE_TIME)}
                >
                  T
                </Button>
              </Tooltip>
            </li>
            <li>
              <Tooltip placement="left" title="Selftime">
                <Button
                  className="TraceGraph--btn-selftime"
                  htmlType="button"
                  shape="circle"
                  size="small"
                  onClick={() => this.toggleNodeMode(MODE_SELFTIME)}
                >
                  ST
                </Button>
              </Tooltip>
            </li>
          </ul>
          {showHelp && (
            <Card
              title="Help"
              bordered={false}
              extra={
                <a onClick={this.closeSidebar} role="button" aria-label="Close">
                  <IoClose />
                </a>
              }
            >
              {HELP_CONTENT}
            </Card>
          )}
        </div>
      </div>
    );
  }
}
