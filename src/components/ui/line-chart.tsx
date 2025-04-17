"use client"

import { Line, LineChart as RechartsLineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts"

interface LineChartProps {
  data: any[]
  categories: string[]
  index: string
  colors?: string[]
  className?: string
  valueFormatter?: (value: number) => string
  customTooltip?: React.FC<any>
  referenceLines?: Array<{
    y: number
    label?: string
    color?: string
    strokeDasharray?: string
  }>
  yAxisProps?: Partial<any>
  height?: number | string
}

export function LineChart({
  data,
  categories,
  index,
  colors = ["#2563eb"],
  className,
  valueFormatter = (value: number) => `${value}`,
  customTooltip,
  referenceLines = [],
  yAxisProps = {},
  height = "100%",
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <RechartsLineChart 
        data={data}
        margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
      >
        <XAxis
          dataKey={index}
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: '0.7rem' }}
          tickMargin={8}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={valueFormatter}
          tick={{ fontSize: '0.7rem' }}
          width={40}
          {...yAxisProps}
        />
        <Tooltip
          content={customTooltip ? customTooltip : ({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm max-w-[90vw] sm:max-w-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                        {index}
                      </span>
                      <span className="font-bold text-muted-foreground text-xs sm:text-sm">
                        {payload[0].payload[index]}
                      </span>
                    </div>
                    {categories.map((category, i) => (
                      <div key={category} className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          {category}
                        </span>
                        <span className="font-bold text-xs sm:text-sm" style={{ color: colors[i] }}>
                          {valueFormatter(payload[i].value as number)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }
            return null
          }}
          wrapperStyle={{ zIndex: 1000 }}
        />
        {referenceLines.map((line, index) => (
          <ReferenceLine
            key={`ref-line-${index}`}
            y={line.y}
            stroke={line.color || "#888888"}
            strokeDasharray={line.strokeDasharray || "3 3"}
            label={line.label ? {
              position: "right",
              value: line.label,
              fill: line.color || "#888888",
              fontSize: 10,
            } : undefined}
          />
        ))}
        {categories.map((category, i) => (
          <Line
            key={category}
            type="monotone"
            dataKey={category}
            stroke={colors[i]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 1 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  )
} 