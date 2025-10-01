import React from 'react';
import FormInput from './FormInput';
import Button from './Button';

export const LoginForm = ({ 
    formData, 
    errors, 
    isLoading, 
    onChange, 
    onSubmit 
}) => {
    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <FormInput
                label="Usuario"
                name="username"
                value={formData.username}
                onChange={onChange}
                error={errors.username}
                required
                placeholder="Ingrese su usuario"
            />
            <FormInput
                label="Contraseña"
                type="password"
                name="password"
                value={formData.password}
                onChange={onChange}
                error={errors.password}
                required
                placeholder="Ingrese su contraseña"
            />
            
            {errors.submit && (
                <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                        <div className="text-sm text-red-700">
                            {errors.submit}
                        </div>
                    </div>
                </div>
            )}

            <div>
                <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                >
                    {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </Button>
            </div>
        </form>
    );
};