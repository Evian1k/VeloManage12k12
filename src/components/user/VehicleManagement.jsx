import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, 
  Plus, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  Calendar,
  MapPin,
  Settings,
  FileText,
  Camera,
  QrCode,
  Bell,
  Wrench
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';

const VehicleManagement = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const { toast } = useToast();

  const [newVehicle, setNewVehicle] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    licensePlate: '',
    color: '',
    engineType: 'petrol',
    transmission: 'manual',
    vin: '',
    mileage: { current: 0 },
    maintenance: { serviceInterval: 3000 }
  });

  // Fetch vehicles on component mount
  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/vehicles', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVehicles(data.data);
      } else {
        throw new Error('Failed to fetch vehicles');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load vehicles"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/vehicles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newVehicle)
      });

      if (response.ok) {
        const data = await response.json();
        setVehicles([data.data, ...vehicles]);
        setShowAddDialog(false);
        setNewVehicle({
          make: '',
          model: '',
          year: new Date().getFullYear(),
          licensePlate: '',
          color: '',
          engineType: 'petrol',
          transmission: 'manual',
          vin: '',
          mileage: { current: 0 },
          maintenance: { serviceInterval: 3000 }
        });
        
        toast({
          title: "Success",
          description: "Vehicle added successfully"
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add vehicle');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  const handleUpdateMileage = async (vehicleId, newMileage) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/vehicles/${vehicleId}/mileage`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mileage: newMileage })
      });

      if (response.ok) {
        const data = await response.json();
        setVehicles(vehicles.map(v => 
          v._id === vehicleId 
            ? { ...v, mileage: data.data.mileage, maintenance: { ...v.maintenance, nextService: data.data.nextService } }
            : v
        ));
        
        toast({
          title: "Success",
          description: "Mileage updated successfully"
        });
      } else {
        throw new Error('Failed to update mileage');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'in_service': return 'bg-blue-100 text-blue-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMaintenanceStatus = (vehicle) => {
    if (vehicle.isMaintenanceDue) {
      return { status: 'overdue', color: 'bg-red-100 text-red-800', text: 'Overdue' };
    }
    
    if (vehicle.maintenance?.nextService) {
      const daysUntilService = Math.ceil((new Date(vehicle.maintenance.nextService) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysUntilService <= 7) {
        return { status: 'due_soon', color: 'bg-orange-100 text-orange-800', text: 'Due Soon' };
      }
      if (daysUntilService <= 30) {
        return { status: 'upcoming', color: 'bg-yellow-100 text-yellow-800', text: 'Upcoming' };
      }
    }
    
    return { status: 'ok', color: 'bg-green-100 text-green-800', text: 'Up to Date' };
  };

  const VehicleCard = ({ vehicle }) => {
    const maintenanceStatus = getMaintenanceStatus(vehicle);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
      >
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Car className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </CardTitle>
                  <p className="text-sm text-gray-600">{vehicle.licensePlate}</p>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <Badge className={getStatusColor(vehicle.status)}>
                  {vehicle.status.replace('_', ' ').toUpperCase()}
                </Badge>
                <Badge className={maintenanceStatus.color}>
                  {maintenanceStatus.text}
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">Mileage</p>
                <p className="font-semibold">{vehicle.mileage?.current?.toLocaleString() || 0} km</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Engine</p>
                <p className="font-semibold capitalize">{vehicle.engineType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Color</p>
                <p className="font-semibold">{vehicle.color || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Transmission</p>
                <p className="font-semibold capitalize">{vehicle.transmission}</p>
              </div>
            </div>

            {vehicle.maintenance?.nextService && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Wrench className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-600">Next Service</span>
                  </div>
                  <span className="text-sm font-medium">
                    {new Date(vehicle.maintenance.nextService).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedVehicle(vehicle);
                  setShowDetailsDialog(true);
                }}
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                Details
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedVehicle(vehicle);
                  setShowEditDialog(true);
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const VehicleDetailsDialog = () => (
    <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Car className="h-5 w-5" />
            <span>{selectedVehicle?.year} {selectedVehicle?.make} {selectedVehicle?.model}</span>
          </DialogTitle>
        </DialogHeader>
        
        {selectedVehicle && (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Vehicle Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm text-gray-600">License Plate</Label>
                      <p className="font-semibold">{selectedVehicle.licensePlate}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">VIN</Label>
                      <p className="font-semibold">{selectedVehicle.vin || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Color</Label>
                      <p className="font-semibold">{selectedVehicle.color || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Engine Type</Label>
                      <p className="font-semibold capitalize">{selectedVehicle.engineType}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Transmission</Label>
                      <p className="font-semibold capitalize">{selectedVehicle.transmission}</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Current Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm text-gray-600">Status</Label>
                      <Badge className={getStatusColor(selectedVehicle.status)}>
                        {selectedVehicle.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Current Mileage</Label>
                      <p className="font-semibold">{selectedVehicle.mileage?.current?.toLocaleString() || 0} km</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">QR Code</Label>
                      <div className="flex items-center space-x-2">
                        <QrCode className="h-4 w-4" />
                        <span className="text-sm font-mono">{selectedVehicle.qrCode?.code}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="maintenance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Maintenance Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Service Interval</p>
                        <p className="text-sm text-gray-600">Every {selectedVehicle.maintenance?.serviceInterval || 3000} km</p>
                      </div>
                    </div>
                    
                    {selectedVehicle.maintenance?.nextService && (
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div>
                          <p className="font-medium">Next Service Due</p>
                          <p className="text-sm text-gray-600">
                            {new Date(selectedVehicle.maintenance.nextService).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={getMaintenanceStatus(selectedVehicle).color}>
                          {getMaintenanceStatus(selectedVehicle).text}
                        </Badge>
                      </div>
                    )}
                    
                    <div className="mt-4">
                      <Label htmlFor="mileage-update">Update Current Mileage</Label>
                      <div className="flex space-x-2 mt-2">
                        <Input
                          id="mileage-update"
                          type="number"
                          placeholder="Enter current mileage"
                          defaultValue={selectedVehicle.mileage?.current || 0}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateMileage(selectedVehicle._id, parseInt(e.target.value));
                            }
                          }}
                        />
                        <Button 
                          onClick={(e) => {
                            const input = e.target.parentElement.querySelector('input');
                            handleUpdateMileage(selectedVehicle._id, parseInt(input.value));
                          }}
                        >
                          Update
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="documents" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Vehicle Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                      <Camera className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-600">Upload vehicle documents</p>
                      <p className="text-sm text-gray-400">Registration, insurance, inspection certificates</p>
                      <Button variant="outline" className="mt-2">
                        <Plus className="h-4 w-4 mr-2" />
                        Upload Documents
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Notification Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Maintenance Reminders</p>
                      <p className="text-sm text-gray-600">Get notified when maintenance is due</p>
                    </div>
                    <Switch defaultChecked={selectedVehicle.notifications?.maintenanceReminders} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Insurance Reminders</p>
                      <p className="text-sm text-gray-600">Get notified before insurance expires</p>
                    </div>
                    <Switch defaultChecked={selectedVehicle.notifications?.insuranceReminders} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Registration Reminders</p>
                      <p className="text-sm text-gray-600">Get notified before registration expires</p>
                    </div>
                    <Switch defaultChecked={selectedVehicle.notifications?.registrationReminders} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Vehicles</h2>
          <p className="text-gray-600">Manage your vehicles and track maintenance</p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Vehicle</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleAddVehicle} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="make">Make</Label>
                  <Input
                    id="make"
                    value={newVehicle.make}
                    onChange={(e) => setNewVehicle({...newVehicle, make: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={newVehicle.model}
                    onChange={(e) => setNewVehicle({...newVehicle, model: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    value={newVehicle.year}
                    onChange={(e) => setNewVehicle({...newVehicle, year: parseInt(e.target.value)})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="licensePlate">License Plate</Label>
                  <Input
                    id="licensePlate"
                    value={newVehicle.licensePlate}
                    onChange={(e) => setNewVehicle({...newVehicle, licensePlate: e.target.value.toUpperCase()})}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    value={newVehicle.color}
                    onChange={(e) => setNewVehicle({...newVehicle, color: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="engineType">Engine Type</Label>
                  <Select 
                    value={newVehicle.engineType} 
                    onValueChange={(value) => setNewVehicle({...newVehicle, engineType: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="petrol">Petrol</SelectItem>
                      <SelectItem value="diesel">Diesel</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="electric">Electric</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="transmission">Transmission</Label>
                  <Select 
                    value={newVehicle.transmission} 
                    onValueChange={(value) => setNewVehicle({...newVehicle, transmission: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="automatic">Automatic</SelectItem>
                      <SelectItem value="cvt">CVT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="mileage">Current Mileage (km)</Label>
                  <Input
                    id="mileage"
                    type="number"
                    min="0"
                    value={newVehicle.mileage.current}
                    onChange={(e) => setNewVehicle({
                      ...newVehicle, 
                      mileage: { ...newVehicle.mileage, current: parseInt(e.target.value) || 0 }
                    })}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="vin">VIN (Optional)</Label>
                <Input
                  id="vin"
                  value={newVehicle.vin}
                  onChange={(e) => setNewVehicle({...newVehicle, vin: e.target.value})}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Vehicle</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {vehicles.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Car className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No vehicles added yet</h3>
            <p className="text-gray-600 mb-4">Add your first vehicle to start tracking maintenance and services</p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Vehicle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {vehicles.map((vehicle) => (
              <VehicleCard key={vehicle._id} vehicle={vehicle} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <VehicleDetailsDialog />
    </div>
  );
};

export default VehicleManagement;