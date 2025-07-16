// Copyright (c) 2021 The Jaeger Authors.
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
import { AreaChart, Area, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import LoadingIndicator from '../../common/LoadingIndicator';
import { ServiceMetricsObject } from '../../../types/metrics';
import './serviceGraph.css';
import { ApiError } from '../../../types/api-error';

type TProps = {
  width: number;
  error: null | ApiError;
  name: string;
  metricsData: ServiceMetricsObject | ServiceMetricsObject[] | null;
  loading: boolean;
  showLegend?: boolean;
  showHorizontalLines?: boolean;
  yDomain?: number[];
  color?: string;
  marginClassName?: string;
  yAxisTickFormat?: (v: number) => number;
  xDomain: number[];
};

type MetricDataPoint = {
  x: number;
  [key: string]: number | null;
};

export const tickFormat = (v: number): string => {
  const dateObj = new Date(v);
  const hours = dateObj.getHours().toString();
  const minutes = dateObj.getMinutes().toString();

  return `${hours.length === 1 ? `0${hours}` : hours}:${minutes.length === 1 ? `0${minutes}` : minutes}`;
};

type TPlaceholder = {
  name: string;
  marginClassName?: string;
  width: number;
  height: number;
  children: React.ReactNode;
};

export const Placeholder = ({
  name,
  marginClassName,
  width,
  height,
  children,
}: TPlaceholder): JSX.Element => {
  return (
    <div
      className={`graph-container ${marginClassName}`}
      style={{
        height,
      }}
      data-testid="service-graph"
    >
      <h3 className="graph-header">{name}</h3>
      <div
        className="center-placeholder"
        style={{
          width,
          height: height - 74,
        }}
      >
        {children}
      </div>
    </div>
  );
};

// Helper functions moved outside component
const HEIGHT = 242;
const COLORS: string[] = ['#869ADD', '#EA9977', '#DCA3D2'];

const getData = (
  metricsData: ServiceMetricsObject | ServiceMetricsObject[] | null
): ServiceMetricsObject[] => {
  if (metricsData === null) {
    return [];
  }

  const data = Array.isArray(metricsData) ? metricsData : [metricsData];
  return data.sort((a, b) => b.quantile - a.quantile);
};

const getMetricsData = (
  metricsData: ServiceMetricsObject | ServiceMetricsObject[] | null
): MetricDataPoint[] => {
  const serviceMetricObjects = getData(metricsData);
  if (serviceMetricObjects.length === 0 || !serviceMetricObjects[0].metricPoints) {
    return [];
  }

  const result = Array(serviceMetricObjects[0].metricPoints.length);
  for (let i = 0; i < serviceMetricObjects[0].metricPoints.length; i++) {
    result[i] = {
      x: serviceMetricObjects[0].metricPoints[i].x,
      ...serviceMetricObjects.reduce((acc: Record<string, number | null>, obj) => {
        acc[obj.quantile.toString()] = obj.metricPoints[i].y;
        return acc;
      }, {}),
    };
  }
  return result;
};

const calculateYDomain = (data: MetricDataPoint[]): number[] => {
  if (!data || data.length === 0) return [0, 1];

  let min = Infinity;
  let max = -Infinity;

  data.forEach(point => {
    Object.entries(point).forEach(([key, value]) => {
      if (key !== 'x' && value !== null) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    });
  });

  if (min === Infinity || max === -Infinity) return [0, 1];

  const range = max - min;
  const padding = range * 0.1;
  min = Math.max(0, min - padding);
  max += padding;

  const magnitude = Math.floor(Math.log10(max - min));
  const roundTo = 10 ** (magnitude - 1);

  return [Math.floor(min / roundTo) * roundTo, Math.ceil(max / roundTo) * roundTo];
};

const calculateYAxisTicks = (domain: number[]): number[] => {
  const [min, max] = domain;
  const step = (max - min) / 4;
  return Array.from({ length: 5 }, (_, i) => min + step * i);
};

const formatYAxisTick = (value: number, name: string, yAxisTickFormat?: (v: number) => number): string => {
  if (yAxisTickFormat) {
    return String(yAxisTickFormat(value));
  }

  if (name.includes('Error rate')) {
    return value.toFixed(0);
  }

  if (value === 0) return '0';
  if (value < 0.01) return value.toExponential(2);
  if (value < 1) return value.toFixed(3);
  if (value < 10) return value.toFixed(2);
  if (value < 100) return value.toFixed(1);
  return value.toFixed(0);
};

const renderLines = (
  metricsData: ServiceMetricsObject | ServiceMetricsObject[] | null,
  color?: string
): JSX.Element[] => {
  if (metricsData) {
    const graphs: JSX.Element[] = [];
    let i = 0;

    getData(metricsData).forEach((line: ServiceMetricsObject, idx: number) => {
      graphs.push(
        <Area
          key={i++}
          type="linear"
          dataKey={line.quantile.toString()}
          stroke={color || COLORS[idx]}
          strokeWidth={2}
          fill={color || COLORS[idx]}
          fillOpacity={0.1}
          connectNulls={false}
          isAnimationActive={false}
        />
      );
    });

    return graphs;
  }

  return [];
};

const generatePlaceholder = (placeHolder: React.ReactNode, width: number): JSX.Element => {
  return (
    <div
      className="center-placeholder"
      style={{
        width,
        height: HEIGHT - 74,
      }}
    >
      {placeHolder}
    </div>
  );
};

const calculateNumericTicks = (xDomain: number[]): number[] => {
  const [start, end] = xDomain;
  const count = 7;
  const step = (end - start) / (count - 1);

  return Array.from({ length: count }, (_, i) => start + step * i);
};

export const ServiceGraphImpl: React.FC<TProps> = ({
  width,
  yDomain,
  showHorizontalLines,
  showLegend,
  loading,
  metricsData,
  marginClassName,
  name,
  error,
  xDomain,
  color,
  yAxisTickFormat,
}) => {
  if (loading || !xDomain || xDomain[0] === undefined || xDomain[1] === undefined)
    return (
      <Placeholder name={name} marginClassName={marginClassName} width={width} height={HEIGHT}>
        <LoadingIndicator centered />
      </Placeholder>
    );

  if (error)
    return (
      <Placeholder name={name} marginClassName={marginClassName} width={width} height={HEIGHT}>
        Could not fetch data
      </Placeholder>
    );

  if (metricsData === null)
    return (
      <Placeholder name={name} marginClassName={marginClassName} width={width} height={HEIGHT}>
        No Data
      </Placeholder>
    );

  const data = getMetricsData(metricsData);
  const effectiveYDomain = yDomain || calculateYDomain(data);

  const legendFormatter = (value: string): JSX.Element => {
    const dataVal = getData(metricsData);
    const foundIdx = dataVal.findIndex(d => d.quantile.toString() === value);
    if (foundIdx === -1) return <span>N/A</span>;
    const quantile = dataVal[foundIdx]?.quantile;
    if (quantile == null) return <span>N/A</span>;
    return <span>{quantile * 100}th</span>;
  };

  const formatYAxisTickCallback = (value: number): string => {
    return formatYAxisTick(value, name, yAxisTickFormat);
  };

  return (
    <Placeholder name={name} marginClassName={marginClassName} width={width} height={HEIGHT}>
      <ResponsiveContainer width="100%" height={HEIGHT}>
        <AreaChart data={data} margin={{ top: 20, bottom: 55, left: 0, right: 0 }}>
          <XAxis
            domain={xDomain}
            tickFormatter={tickFormat}
            dataKey="x"
            className="graph-x-axis"
            tickLine={{ className: 'graph-axis' }}
            axisLine={{ className: 'graph-axis' }}
            height={30}
            type="number"
            ticks={calculateNumericTicks(xDomain)}
            tickMargin={4}
            tick={{ dx: 0, dy: 4 }}
          />
          <YAxis
            domain={effectiveYDomain}
            tickFormatter={formatYAxisTickCallback}
            className="graph-y-axis"
            tickLine={{ className: 'graph-axis' }}
            axisLine={{ className: 'graph-axis' }}
            width={45}
            ticks={calculateYAxisTicks(effectiveYDomain)}
            tickMargin={4}
            tick={{ dx: -4, dy: 0 }}
          />
          <CartesianGrid horizontal={showHorizontalLines} vertical={false} />

          {renderLines(metricsData, color)}

          <Tooltip
            contentStyle={{ fontSize: '0.625rem' }}
            labelFormatter={(value: number) => new Date(value).toLocaleString()}
            formatter={(value: number, uname: string) => {
              if (!showLegend) {
                return [formatYAxisTick(value, name, yAxisTickFormat)];
              }
              const formattedName = Number(uname) * 100;
              return [formatYAxisTick(value, name, yAxisTickFormat), `P${formattedName}`];
            }}
          />

          {showLegend && (
            <Legend
              align="left"
              verticalAlign="bottom"
              height={10}
              iconType="plainline"
              formatter={legendFormatter}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </Placeholder>
  );
};

// Export helper functions for testing
export {
  getData,
  getMetricsData,
  calculateYDomain,
  calculateYAxisTicks,
  formatYAxisTick,
  renderLines,
  generatePlaceholder,
  calculateNumericTicks,
  HEIGHT,
  COLORS,
};

export default ServiceGraphImpl;
