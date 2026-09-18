import React, { useState, useEffect, useMemo } from 'react';
import {
  Globe,
  Activity,
  Database,
  AlertTriangle,
  Search,
  RefreshCw,
  FileText,
  ChevronDown,
  ExternalLink,
  ShieldAlert,
  Server,
  HardDrive,
  CheckCircle2,
  HelpCircle,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface TrafficLog {
  id: string;
  timestamp: string;
  ip: string;
  country: string;
  domain: string;
  method: string;
  url: string;
  statusCode: number;
  size: number;
  duration: number;
}

interface AnalyticsTabProps {
  isAdmin: boolean;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ isAdmin }) => {
  const [logs, setLogs] = useState<TrafficLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [timeFilter, setTimeFilter] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [selectedDomain, setSelectedDomain] = useState<string>('shanglawelfare.org');
  const [topListTab, setTopListTab] = useState<'countries' | 'ips' | 'requests' | 'domains'>('countries');
  const [subTab, setSubTab] = useState<'analytics' | 'logs' | '5xx' | '4xx'>('analytics');
  const [searchQuery, setSearchQuery] = useState('');
  const [isChartExpanded, setIsChartExpanded] = useState(true);

  // Fetch log data
  const fetchTrafficLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/traffic-logs');
      if (!res.ok) {
        throw new Error('Failed to fetch server traffic logs');
      }
      const result = await res.json();
      if (result.success && result.data) {
        setLogs(result.data);
      } else {
        throw new Error('Invalid response payload');
      }
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Connection offline');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrafficLogs();
    // Real-time polling every 10 seconds for dynamic updates
    const timer = setInterval(() => {
      fetchTrafficLogs();
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Filter logs by selected timeframe and selected domain
  const filteredLogsByTime = useMemo(() => {
    const now = Date.now();
    let thresholdMs = 24 * 60 * 60 * 1000; // default 24h
    if (timeFilter === '1h') thresholdMs = 1 * 60 * 60 * 1000;
    else if (timeFilter === '6h') thresholdMs = 6 * 60 * 60 * 1000;
    else if (timeFilter === '7d') thresholdMs = 7 * 24 * 60 * 60 * 1000;

    return logs.filter((log) => {
      const logTime = new Date(log.timestamp).getTime();
      const withinTime = now - logTime <= thresholdMs;
      const matchesDomain = selectedDomain === 'all' || log.domain === selectedDomain;
      return withinTime && matchesDomain;
    });
  }, [logs, timeFilter, selectedDomain]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalRequests = filteredLogsByTime.length;
    let totalBytes = 0;
    const uniqueIps = new Set<string>();
    let totalDuration = 0;

    filteredLogsByTime.forEach((log) => {
      totalBytes += log.size || 0;
      uniqueIps.add(log.ip);
      totalDuration += log.duration || 0;
    });

    const avgDuration = totalRequests > 0 ? Math.round(totalDuration / totalRequests) : 0;

    return {
      totalRequests,
      totalBytes,
      uniqueIpsCount: uniqueIps.size,
      avgDuration,
    };
  }, [filteredLogsByTime]);

  // Format bandwidth nicely
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Top Lists Calculations
  const topLists = useMemo(() => {
    const countriesMap: Record<string, number> = {};
    const ipsMap: Record<string, number> = {};
    const requestsMap: Record<string, number> = {};
    const domainsMap: Record<string, number> = {};

    filteredLogsByTime.forEach((log) => {
      countriesMap[log.country || 'Unknown'] = (countriesMap[log.country || 'Unknown'] || 0) + 1;
      ipsMap[log.ip || '127.0.0.1'] = (ipsMap[log.ip || '127.0.0.1'] || 0) + 1;
      requestsMap[log.url || '/'] = (requestsMap[log.url || '/'] || 0) + 1;
      domainsMap[log.domain || 'shanglawelfare.org'] = (domainsMap[log.domain || 'shanglawelfare.org'] || 0) + 1;
    });

    const getSortedList = (map: Record<string, number>) => {
      return Object.entries(map)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    };

    return {
      countries: getSortedList(countriesMap),
      ips: getSortedList(ipsMap),
      requests: getSortedList(requestsMap),
      domains: getSortedList(domainsMap),
    };
  }, [filteredLogsByTime]);

  // Aggregate request volume by timeframe for the chart
  const chartData = useMemo(() => {
    if (filteredLogsByTime.length === 0) return [];

    const segments: Record<string, number> = {};
    const now = Date.now();

    if (timeFilter === '1h') {
      // 5-minute slots
      for (let i = 0; i < 12; i++) {
        const timeLabel = new Date(now - i * 5 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        segments[timeLabel] = 0;
      }
      filteredLogsByTime.forEach((log) => {
        const d = new Date(log.timestamp);
        // Round to nearest 5 minutes
        const m = Math.floor(d.getMinutes() / 5) * 5;
        d.setMinutes(m);
        d.setSeconds(0);
        const label = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (segments[label] !== undefined) segments[label]++;
      });
    } else if (timeFilter === '6h' || timeFilter === '24h') {
      // Hourly slots
      const slotsCount = timeFilter === '6h' ? 6 : 24;
      for (let i = 0; i < slotsCount; i++) {
        const timeLabel = new Date(now - i * 60 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        segments[timeLabel] = 0;
      }
      filteredLogsByTime.forEach((log) => {
        const d = new Date(log.timestamp);
        d.setMinutes(0);
        d.setSeconds(0);
        const label = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (segments[label] !== undefined) segments[label]++;
      });
    } else {
      // 7 days - daily slots
      for (let i = 0; i < 7; i++) {
        const dayLabel = new Date(now - i * 24 * 60 * 60 * 1000).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        segments[dayLabel] = 0;
      }
      filteredLogsByTime.forEach((log) => {
        const label = new Date(log.timestamp).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        if (segments[label] !== undefined) segments[label]++;
      });
    }

    return Object.entries(segments)
      .map(([name, requests]) => ({ name, requests }))
      .reverse();
  }, [filteredLogsByTime, timeFilter]);

  // SubTab Filtering & Query Search
  const subFilteredLogs = useMemo(() => {
    let baseList = filteredLogsByTime;

    if (subTab === '5xx') {
      baseList = baseList.filter((l) => l.statusCode >= 500);
    } else if (subTab === '4xx') {
      baseList = baseList.filter((l) => l.statusCode >= 400 && l.statusCode < 500);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      baseList = baseList.filter(
        (l) =>
          l.ip.toLowerCase().includes(q) ||
          l.country.toLowerCase().includes(q) ||
          l.url.toLowerCase().includes(q) ||
          l.method.toLowerCase().includes(q) ||
          String(l.statusCode).includes(q)
      );
    }

    return baseList;
  }, [filteredLogsByTime, subTab, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-bold text-emerald-500 tracking-wider uppercase">Live Portal Traffic</span>
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-3">
            Traffic Analytics
            <Database className="w-5 h-5 text-purple-400" />
          </h1>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={fetchTrafficLogs}
            disabled={isLoading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-800 dark:bg-slate-900 bg-white text-xs font-bold text-slate-300 hover:text-emerald-400 hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-500' : ''}`} />
            {isLoading ? 'Polling...' : 'Refresh Logs'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span><strong>Gateway Status Notification:</strong> {error}. Retrying automatically in 10 seconds.</span>
        </div>
      )}

      {/* Main Stats and Configuration Block */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Card: Domain & Metrics Selector */}
        <div className="lg:col-span-7 glass-card border-purple-500/20 p-5 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Domain info row */}
            <div className="flex items-start justify-between">
              <div>
                <a
                  href="https://shanglawelfare.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5 text-lg font-black text-slate-100 hover:text-emerald-400 transition-colors"
                >
                  shanglawelfare.org
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                </a>
                <p className="text-[11px] text-slate-400 font-medium">Domain shown</p>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Gateway Active</span>
              </div>
            </div>

            {/* Metrics figures */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/60">
              <div className="space-y-1">
                <span className="text-3xl font-black text-slate-100 tracking-tight font-mono">
                  {formatBytes(metrics.totalBytes)}
                </span>
                <p className="text-[11px] text-slate-400 font-medium">Total bandwidth</p>
              </div>

              <div className="space-y-1">
                <span className="text-3xl font-black text-slate-100 tracking-tight font-mono">
                  {metrics.totalRequests.toLocaleString()}
                </span>
                <p className="text-[11px] text-slate-400 font-medium">Total Number of Requests</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/40 space-y-0.5">
                <span className="text-base font-bold text-slate-200 font-mono">
                  {metrics.uniqueIpsCount}
                </span>
                <p className="text-[10px] text-slate-400 font-medium">Unique Client IPs</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/40 space-y-0.5">
                <span className="text-base font-bold text-slate-200 font-mono">
                  {metrics.avgDuration} ms
                </span>
                <p className="text-[10px] text-slate-400 font-medium">Avg Response Latency</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-800/60">
            {/* Domain Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Change domain</label>
              <div className="relative">
                <select
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 py-3 pl-4 pr-10 rounded-xl appearance-none focus:outline-none focus:border-emerald-500 font-bold transition-all cursor-pointer"
                >
                  <option value="shanglawelfare.org">shanglawelfare.org</option>
                  <option value="all">All Domains / Subdomains</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Time filters */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">Filter by</label>
              <div className="flex flex-wrap gap-2">
                {(['1h', '6h', '24h', '7d'] as const).map((filter) => {
                  const labelMap = {
                    '1h': 'Last 1 hour',
                    '6h': 'Last 6 hours',
                    '24h': 'Last 24 hours',
                    '7d': 'Last 7 days',
                  };
                  const isActive = timeFilter === filter;
                  return (
                    <button
                      key={filter}
                      onClick={() => setTimeFilter(filter)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-purple-500/15 border border-purple-500/40 text-emerald-400 shadow-md'
                          : 'bg-slate-950/40 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {labelMap[filter]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Top List */}
        <div className="lg:col-span-5 glass-card border-purple-500/20 p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-lg font-black text-slate-100 tracking-tight">Top list</h3>

            {/* Sub-tabs for rankings */}
            <div className="flex flex-wrap gap-1 p-1 bg-slate-950 border border-slate-800/80 rounded-xl">
              {(['countries', 'ips', 'requests', 'domains'] as const).map((tab) => {
                const labelMap = {
                  countries: 'Countries',
                  ips: 'IP Addresses',
                  requests: 'Requests',
                  domains: 'Domains',
                };
                const isActive = topListTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setTopListTab(tab)}
                    className={`flex-1 text-[11px] font-bold py-2 px-2.5 rounded-lg text-center transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {labelMap[tab]}
                  </button>
                );
              })}
            </div>

            {/* Rankings List */}
            <div className="space-y-3.5 min-h-[220px] justify-center flex flex-col">
              {topLists[topListTab].length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  No activity matching parameters
                </div>
              ) : (
                topLists[topListTab].map((item, index) => {
                  const maxCount = topLists[topListTab][0]?.count || 1;
                  const percent = Math.round((item.count / maxCount) * 100);

                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-[10px] text-slate-500 font-mono w-4">
                            {index + 1}
                          </span>
                          <span className="truncate max-w-[180px] sm:max-w-[240px] font-medium" title={item.name}>
                            {item.name}
                          </span>
                        </div>
                        <span className="font-mono text-slate-200">{item.count.toLocaleString()}</span>
                      </div>
                      {/* Custom styled progress bar */}
                      <div className="w-full h-1.5 bg-slate-950 border border-slate-800/40 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${percent}%` }}
                          className="h-full bg-emerald-500/80 rounded-full transition-all duration-500"
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="text-[10px] text-slate-500 text-right font-medium pt-4 border-t border-slate-800/40">
            Real-time analytics engine updated live
          </div>
        </div>
      </div>

      {/* Sub tabs section at the bottom */}
      <div className="space-y-4">
        {/* Sub Navigation */}
        <div className="flex border-b border-slate-800/80">
          {(['analytics', 'logs', '5xx', '4xx'] as const).map((tab) => {
            const labelMap = {
              analytics: 'Analytics',
              logs: 'Access logs',
              '5xx': 'Error code 5xx',
              '4xx': 'Error code 4xx',
            };
            const isActive = subTab === tab;
            return (
              <button
                key={tab}
                onClick={() => {
                  setSubTab(tab);
                  setSearchQuery('');
                }}
                className={`text-xs font-bold py-3.5 px-4 -mb-px border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {labelMap[tab]}
              </button>
            );
          })}
        </div>

        {/* Analytics Panel */}
        {subTab === 'analytics' && (
          <div className="glass-card border-slate-800/60 overflow-hidden">
            {/* Chart toggle header */}
            <div
              onClick={() => setIsChartExpanded(!isChartExpanded)}
              className="flex items-center justify-between p-4 bg-slate-900/40 border-b border-slate-800/60 cursor-pointer hover:bg-slate-900/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-300">Total requests</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isChartExpanded ? 'rotate-180' : ''}`} />
            </div>

            {isChartExpanded && (
              <div className="p-4 sm:p-6 space-y-4">
                <div className="h-[260px] w-full">
                  {chartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                      Waiting for portal request data stream...
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 9, fontWeight: 500 }}
                          dy={6}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 9, fontWeight: 500 }}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
                          contentStyle={{
                            backgroundColor: '#020617',
                            border: '1px solid rgba(139, 92, 246, 0.25)',
                            borderRadius: '12px',
                            padding: '10px 14px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                          }}
                          labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}
                          itemStyle={{ color: '#34d399', fontSize: '12px', fontWeight: 'bold' }}
                        />
                        <Bar
                          dataKey="requests"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={45}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium px-2">
                  <span>Portal requests trendline</span>
                  <span>Interval automatically scaled to filter duration ({timeFilter})</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Logs Table (Access logs / 5xx / 4xx) */}
        {subTab !== 'analytics' && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-4.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search raw access logs by IP, country, method, route or status code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 text-xs pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500 placeholder-slate-500 text-slate-200 transition-all font-medium"
              />
            </div>

            {/* Logs List Container */}
            <div className="glass-card border-slate-800/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 border-b border-slate-800/60 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Request Route</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4">IP Address</th>
                      <th className="py-3 px-4">Country</th>
                      <th className="py-3 px-4 text-right">Size</th>
                      <th className="py-3 px-4 text-right">Latency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-300 font-medium">
                    {subFilteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500">
                          {isLoading ? (
                            <div className="flex items-center justify-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Fetching matching logs stream...
                            </div>
                          ) : (
                            'No gateway traffic logs matching query parameters'
                          )}
                        </td>
                      </tr>
                    ) : (
                      subFilteredLogs.map((log) => {
                        // Badge color according to status code
                        let statusColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                        if (log.statusCode >= 500) {
                          statusColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                        } else if (log.statusCode >= 400) {
                          statusColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                        } else if (log.statusCode >= 300) {
                          statusColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                        }

                        // Short timestamp format
                        const displayTime = new Date(log.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        });
                        const displayDate = new Date(log.timestamp).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        });

                        return (
                          <tr key={log.id} className="hover:bg-slate-900/30 transition-all">
                            <td className="py-3 px-4 text-[11px] font-mono whitespace-nowrap text-slate-400">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>{displayDate}, {displayTime}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-slate-950 border border-slate-800 text-slate-200">
                                {log.method}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] max-w-[200px] truncate text-slate-200" title={log.url}>
                              {log.url}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-black font-mono ${statusColor}`}>
                                {log.statusCode}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                              {log.ip}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                                <Globe className="w-3 h-3 text-purple-400" />
                                <span>{log.country}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right text-[11px] font-mono text-slate-400">
                              {formatBytes(log.size)}
                            </td>
                            <td className="py-3 px-4 text-right text-[11px] font-mono text-emerald-400/90">
                              {log.duration} ms
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
