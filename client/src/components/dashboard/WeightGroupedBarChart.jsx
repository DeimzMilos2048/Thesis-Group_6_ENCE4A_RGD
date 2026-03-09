import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Weight } from 'lucide-react';

const WeightGroupedBarChart = ({ savedWeights = {}, savedAfterWeights = {} }) => {
  const [weightData, setWeightData] = useState([]);

  useEffect(() => {
    const transformed = Array.from({ length: 6 }, (_, idx) => {
      const tray = idx + 1;
      const beforeWeight = savedWeights[tray]?.before ?? 0;
      const afterWeight = savedAfterWeights[tray]?.after ?? 0;

      return {
        tray: `Tray ${tray}`,
        beforeDrying: Number(beforeWeight).toFixed(2),
        afterDrying: Number(afterWeight).toFixed(2),
      };
    });

    setWeightData(transformed);
  }, [savedWeights, savedAfterWeights]);

  return (
    <div className="analytics-cards">
      <h3 className="analytics-card-title">
        <div className="analytics-card-title-left">
          <Weight size={24} /> Weight 
        </div>
        <div className="sensor-badges">
          <span className="sensor-badge" style={{ color: '#9E9E9E', backgroundColor: 'white' }}>
            {weightData.length} Trays
          </span>
        </div>
      </h3>

      <div className="analytics-card-status" style={{ height: '400px', width: '100%' }}>
        {weightData && weightData.length > 0 && (Object.keys(savedWeights).length > 0 || Object.keys(savedAfterWeights).length > 0) ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={weightData}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="tray"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                unit="kg"              
                domain={[0, 'auto']} 
              />
              <Tooltip
                formatter={(value) => `${Number(value).toFixed(2)}kg`} 
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                  padding: '10px',
                }}
              />
              <Legend
                verticalAlign="top"
                height={36}
                wrapperStyle={{ paddingBottom: '20px' }}
              />
             
              <Bar
                dataKey="beforeDrying"
                fill="#3b82f6"
                name="Before Drying"
                radius={[8, 8, 0, 0]}
              />

              <Bar
                dataKey="afterDrying"
                fill="#ef4444"
                name="After Drying"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <p>No weight data available. Save weights from the Dashboard to see the comparison.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeightGroupedBarChart;