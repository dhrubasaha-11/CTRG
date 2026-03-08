/**
 * User Profile Page.
 * Shows user info and links to change password.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Shield, Key } from 'lucide-react';
import { useAuth } from './AuthContext';

const ProfilePage: React.FC = () => {
    const { user, role } = useAuth();

    const roleBasePath = role === 'PI' ? '/pi' : role === 'Reviewer' ? '/reviewer' : '/admin';

    return (
        <div className="w-full max-w-[32rem] mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-600">
                        {user?.first_name?.[0] || user?.username?.[0] || 'U'}
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            {user?.first_name && user?.last_name
                                ? `${user.first_name} ${user.last_name}`
                                : user?.username || 'User'}
                        </h2>
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {role}
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <User size={18} className="text-gray-400" />
                        <div>
                            <p className="text-xs text-gray-500">Username</p>
                            <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Mail size={18} className="text-gray-400" />
                        <div>
                            <p className="text-xs text-gray-500">Email</p>
                            <p className="text-sm font-medium text-gray-900">{user?.email || 'Not set'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Shield size={18} className="text-gray-400" />
                        <div>
                            <p className="text-xs text-gray-500">Role</p>
                            <p className="text-sm font-medium text-gray-900">{role}</p>
                        </div>
                    </div>
                </div>
            </div>

            <Link
                to={`${roleBasePath}/change-password`}
                className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
            >
                <Key size={18} className="text-blue-600" />
                <span className="text-sm font-medium text-gray-900">Change Password</span>
            </Link>
        </div>
    );
};

export default ProfilePage;
