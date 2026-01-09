import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { AnalyticsData } from '../types';
import { analytics } from '../utils/api';
import { WalletIcon, CalendarIcon, XCircleIcon, CheckCircleIcon } from './Icons';

const KPICard: React.FC<{ title: string, value: string | number, icon: React.ElementType, color: string, isLoading: boolean }> = ({ title, value, icon: Icon, color, isLoading }) => (
    <div className="bg-white p-6 rounded-xl shadow-md">
        {isLoading ? (
            <div className="animate-pulse">
                <div className="h-8 w-8 rounded-lg bg-gray-200 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-300 rounded w-1/2 mt-2"></div>
            </div>
        ) : (
            <>
                <div className={`p-2 rounded-lg inline-block ${color}`}>
                    <Icon className="w-6 h-6 text-white"/>
                </div>
                <p className="text-gray-500 font-medium text-sm mt-4">{title}</p>
                <p className="text-3xl font-bold text-dark">{value}</p>
            </>
        )}
    </div>
);


const Analytics: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const currencySymbol = i18n.language === 'ar' ? 'د.ل' : 'LYD';

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError('');
            try {
                const result = await analytics.get(startDate, endDate);
                setData(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch analytics data.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [startDate, endDate]);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-dark">{t('analytics.title')}</h1>
                    <p className="text-gray-500 mt-1">{t('analytics.description')}</p>
                </div>
                <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium">{t('analytics.selectDateRange')}:</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border rounded-md"/>
                    <span className="px-2">to</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border rounded-md"/>
                </div>
            </div>
            
            {error && <div className="bg-red-100 border-s-4 border-red-500 text-red-700 p-4"><p>{error}</p></div>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard title={t('analytics.totalRevenue')} value={`${data?.kpis.totalRevenue.toFixed(2) ?? '0.00'} ${currencySymbol}`} icon={WalletIcon} color="bg-success" isLoading={isLoading} />
                <KPICard title={t('analytics.totalAppointments')} value={data?.kpis.totalAppointments ?? 0} icon={CalendarIcon} color="bg-primary" isLoading={isLoading} />
                <KPICard title={t('analytics.cancellationRate')} value={`${data?.kpis.cancellationRate.toFixed(1) ?? '0.0'}%`} icon={XCircleIcon} color="bg-danger" isLoading={isLoading} />
                <KPICard title={t('analytics.avgRevenue')} value={`${data?.kpis.avgRevenuePerAppointment.toFixed(2) ?? '0.00'} ${currencySymbol}`} icon={CheckCircleIcon} color="bg-secondary" isLoading={isLoading} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-bold text-dark mb-4">{t('analytics.revenueOverTime')}</h3>
                    {isLoading ? <div className="h-64 bg-gray-200 rounded-md animate-pulse"></div> : (data?.revenueOverTime.length ?? 0) > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={data?.revenueOverTime}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                <YAxis />
                                <Tooltip formatter={(value: number) => `${value.toFixed(2)} ${currencySymbol}`} />
                                <Legend />
                                <Line type="monotone" dataKey="revenue" name={t('analytics.revenue')} stroke="#28A745" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : <p className="text-center text-gray-500">{t('analytics.noData')}</p>}
                </div>
                 <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-bold text-dark mb-4">{t('analytics.appointmentsByStatus')}</h3>
                     {isLoading ? <div className="h-64 bg-gray-200 rounded-md animate-pulse"></div> : (data?.appointmentsByStatus.length ?? 0) > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={data?.appointmentsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                    {data?.appointmentsByStatus.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <p className="text-center text-gray-500">{t('analytics.noData')}</p>}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-bold text-dark mb-4">{t('analytics.topPerformingDoctors')}</h3>
                     {isLoading ? <div className="h-64 bg-gray-200 rounded-md animate-pulse"></div> : (data?.topDoctors.length ?? 0) > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                             <BarChart data={data?.topDoctors} layout="vertical" margin={{left: 40}}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }}/>
                                <Tooltip />
                                <Bar dataKey="count" name={t('analytics.appointments')} fill="#17A2B8" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <p className="text-center text-gray-500">{t('analytics.noData')}</p>}
                </div>
                 <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-bold text-dark mb-4">{t('analytics.topBookedSpecialties')}</h3>
                     {isLoading ? <div className="h-64 bg-gray-200 rounded-md animate-pulse"></div> : (data?.topSpecialties.length ?? 0) > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                             <BarChart data={data?.topSpecialties} layout="vertical" margin={{left: 40}}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Bar dataKey="count" name={t('analytics.appointments')} fill="#FFC107" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <p className="text-center text-gray-500">{t('analytics.noData')}</p>}
                </div>
            </div>
        </div>
    );
};

export default Analytics;