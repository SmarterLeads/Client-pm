import dynamic from "next/dynamic";

/** Recharts via next/dynamic — reserved for weekly hours chart in member drawer. */
export const RechartsBarChart = dynamic(
  () => import("recharts").then((mod) => mod.BarChart),
  { ssr: false },
);

export const RechartsBar = dynamic(
  () => import("recharts").then((mod) => mod.Bar),
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
