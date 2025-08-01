// Copyright (c) 2020 Uber Technologies, Inc.
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

import CircularProgressbar from '../common/CircularProgressbar';
import NewWindowIcon from '../common/NewWindowIcon';

import { TQualityMetrics } from './types';

import './ScoreCard.css';

export type TProps = {
  link: string;
  score: TQualityMetrics['scores'][0];
};

const ScoreCard: React.FC<TProps> = ({ link, score }) => {
  const { label, max: maxValue, value } = score;
  const linkText = value < maxValue ? 'How to improve ' : 'Great! What does this mean ';
  return (
    <div className="ScoreCard">
      <span className="ScoreCard--TitleHeader">{label}</span>
      <div className="ScoreCard--CircularProgressbarWrapper">
        <CircularProgressbar
          backgroundHue={value === 0 ? 0 : undefined}
          decorationHue={120}
          maxValue={maxValue}
          text={`${((value / maxValue) * 100).toFixed(1)}%`}
          value={value}
        />
      </div>
      <a href={link} target="_blank" rel="noreferrer noopener">
        {linkText}
        <NewWindowIcon />
      </a>
    </div>
  );
};

export default React.memo(ScoreCard);
