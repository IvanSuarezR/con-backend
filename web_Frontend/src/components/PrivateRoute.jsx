import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../api/authService';

const PrivateRoute = ({ children }) => {
    const location = useLocation();
    if (!authService.isAuthenticated()) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return children;
};

export default PrivateRoute;