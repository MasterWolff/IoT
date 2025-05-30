"use client"

import { Line, LineChart as RechartsLineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface LineChartProps {
  data: any[]
  categories: string[]
  index: string
  colors?: string[]
  className?: string
  valueFormatter?: (value: number) => string
}

export function LineChart({
  data,
  categories,
  index,
  colors = ["#2563eb"],
  className,
  valueFormatter = (value: number) => `${value}`,
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <RechartsLineChart data={data}>
        <XAxis
          dataKey={index}
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={valueFormatter}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                        {index}
                      </span>
                      <span className="font-bold text-muted-foreground">
                        {payload[0].payload[index]}
                      </span>
                    </div>
                    {categories.map((category, i) => (
                      <div key={category} className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          {category}
                        </span>
                        <span className="font-bold" style={{ color: colors[i] }}>
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
        />
        {categories.map((category, i) => (
          <Line
            key={category}
            type="monotone"
            dataKey={category}
            stroke={colors[i]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  )
} 