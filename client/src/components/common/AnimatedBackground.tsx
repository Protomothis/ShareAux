const BAR_DATA = [
  [1.57, 0.05, 31.5],
  [1.07, 1.47, 55.6],
  [1.87, 0.17, 40.3],
  [0.84, 0.44, 45.3],
  [0.83, 0.4, 54],
  [1.45, 0.44, 50.4],
  [1.77, 0.01, 63.3],
  [1.64, 0.68, 24.3],
  [1.95, 0.67, 20.6],
  [0.92, 1.69, 51.2],
  [1.77, 1.46, 47.2],
  [1.97, 0.76, 48.1],
  [1.8, 1.24, 66.7],
  [1.49, 1.41, 17.7],
  [1.07, 0.58, 19.8],
  [1.08, 0.2, 31.7],
  [1.56, 0.73, 37.2],
  [1.05, 0.53, 71.2],
  [1.58, 1.22, 25.3],
  [1.67, 0.33, 37.8],
  [1.99, 1.28, 48.4],
  [1.62, 1.69, 61.6],
  [1.07, 0.06, 33.9],
  [1.12, 0.42, 71.6],
  [1.85, 0.63, 54.3],
  [1.27, 1.83, 42.5],
  [1.12, 0.49, 48.7],
  [1.12, 1.17, 68.9],
  [1.28, 0.44, 74.9],
  [1.41, 0.18, 17.8],
  [0.93, 1.25, 62.5],
  [1.31, 0.13, 37.9],
  [2, 1.06, 73.3],
  [1.83, 0.02, 58.2],
  [1.62, 1.07, 31],
  [1.57, 0.22, 41.1],
  [1.34, 1.91, 67.6],
  [1.12, 1, 25.7],
  [1.9, 1.74, 32.9],
  [1.57, 1.22, 24.2],
  [1.72, 1.08, 61.7],
  [1.44, 0, 34.4],
  [0.82, 1.86, 67.7],
  [1.8, 0.62, 18.5],
  [1.85, 1.89, 20.1],
  [1.38, 0.14, 60.6],
  [1.72, 0.26, 43.5],
  [1.46, 0.53, 67.3],
  [1.31, 0.42, 47.4],
  [1.68, 0.4, 33.7],
  [1.2, 0.8, 42],
  [1.5, 1.1, 55],
  [0.9, 0.3, 38],
  [1.8, 1.5, 62],
  [1.3, 0.9, 28],
  [1.6, 0.2, 70],
  [1.1, 1.7, 45],
  [1.9, 0.6, 52],
  [1.4, 1.3, 35],
  [1.7, 0.1, 58],
];

const PARTICLE_DATA = [
  [99.5, 65, 10.4, 2.6],
  [12.1, 22.5, 9.4, 2.9],
  [23, 22, 6.7, 3.2],
  [22.9, 90.5, 14.6, 0.4],
  [23.8, 66.9, 8.1, 0.7],
  [93.6, 57.1, 10.7, 3.9],
  [80.7, 19, 7, 2.2],
  [42.4, 46.7, 13.3, 3.4],
  [98.4, 9.8, 10, 1.7],
  [86.2, 24.9, 7.9, 2.2],
  [42.2, 27.9, 8.5, 4.6],
  [44.3, 86.1, 11.5, 0.3],
  [15, 80, 8, 0.5],
  [35, 60, 12, 1.2],
  [55, 90, 7, 2],
  [75, 70, 10, 0.8],
  [90, 85, 9, 1.5],
  [10, 50, 14, 3],
  [65, 40, 11, 2.5],
  [50, 65, 7, 3.5],
];

export default function AnimatedBackground() {
  return (
    <>
      {/* Base gradient */}
      <div className="fixed inset-0 -z-20 bg-black" />
      <div className="fixed inset-0 -z-10 animate-gradient bg-[length:400%_400%] bg-gradient-to-br from-sa-accent/20 via-purple-900/20 to-cyan-900/20 opacity-80" />

      {/* Floating orbs */}
      <div className="fixed -left-20 top-1/4 -z-10 h-80 w-80 animate-pulse rounded-full bg-sa-accent/15 blur-[100px]" />
      <div
        className="fixed -right-20 top-2/3 -z-10 h-60 w-60 rounded-full bg-purple-500/15 blur-[100px]"
        style={{ animation: 'pulse 4s ease-in-out infinite 1s' }}
      />
      <div
        className="fixed left-1/2 top-10 -z-10 h-40 w-40 rounded-full bg-cyan-500/10 blur-[80px]"
        style={{ animation: 'pulse 5s ease-in-out infinite 2s' }}
      />

      {/* Audio bars */}
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-0 flex items-end justify-center gap-[3px] px-4 opacity-40">
        {BAR_DATA.map(([d, dl, h], i) => (
          <div
            key={i}
            className="w-[2px] origin-bottom rounded-full bg-gradient-to-t from-sa-accent to-sa-accent-light"
            style={{
              animation: `bar ${d}s ease-in-out infinite alternate`,
              animationDelay: `${dl}s`,
              height: `${h}px`,
            }}
          />
        ))}
      </div>

      {/* Particles */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {PARTICLE_DATA.map(([l, t, dur, dl], i) => (
          <div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-white/40"
            style={{
              left: `${l}%`,
              top: `${t}%`,
              animation: `particle ${dur}s linear infinite`,
              animationDelay: `${dl}s`,
            }}
          />
        ))}
      </div>
    </>
  );
}
