import dynamic from "next/dynamic";

export const RechartsBarChart = dynamic(
  () => import("recharts").then((mod) => mod.BarChart),
  { ssr: false },
);

export const RechartsBar = dynamic(
  () => import("recharts").then((mod) => mod.Bar),
  { ssr: false },
);

export const RechartsLineChart = dynamic(
  () => import("recharts").then((mod) => mod.LineChart),
  { ssr: false },
);

export const RechartsLine = dynamic(
  () => import("recharts").then((mod) => mod.Line),
  { ssr: false },
);

export const RechartsXAxis = dynamic(
  () => import("recharts").then((mod) => mod.XAxis),
  { ssr: false },
);

export const RechartsYAxis = dynamic(
  () => import("recharts").then((mod) => mod.YAxis),
  { ssr: false },
);

export const RechartsResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false },
);

export const RechartsTooltip = dynamic(
  () => import("recharts").then((mod) => mod.Tooltip),
  { ssr: false },
);

export const RechartsLegend = dynamic(
  () => import("recharts").then((mod) => mod.Legend),
  { ssr: false },
);

export const RechartsCartesianGrid = dynamic(
  () => import("recharts").then((mod) => mod.CartesianGrid),
  { ssr: false },
);
