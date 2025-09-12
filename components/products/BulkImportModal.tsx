import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ImportProductData, bulkImportProducts } from '@/data/productManagementRepo';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Papa from 'papaparse';
import React, { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import * as XLSX from 'xlsx';

type Props = {
  visible: boolean;
  onClose: () => void;
  onImportComplete: (result: { success: number; errors: any[] }) => void;
};

export function BulkImportModal({ visible, onClose, onImportComplete }: Props) {
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [previewData, setPreviewData] = useState<ImportProductData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Allow all file types
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        console.log('Selected file:', file.name, 'Type:', file.mimeType, 'Size:', file.size);
        setSelectedFile(file);
        await parseFile(file);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  const parseFile = async (file: any) => {
    try {
      const fileExtension = file.name?.toLowerCase().split('.').pop();
      
      // Validate file extension
      if (!fileExtension || !['csv', 'xlsx', 'xls'].includes(fileExtension)) {
        Alert.alert('Error', 'Please select a CSV or Excel file (.csv, .xlsx, .xls)');
        return;
      }
      
      if (fileExtension === 'csv') {
        // Parse CSV file
        const content = await FileSystem.readAsStringAsync(file.uri);
        
        Papa.parse(content, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsedData = results.data.map((row: any, index: number) => ({
              name: row.name || row.product_name || row['Product Name'] || '',
              parentCategory: row.parent_category || row.parentCategory || row['Parent Category'] || '',
              subcategory: row.subcategory || row.sub_category || row['Subcategory'] || row.category || row.category_name || row['Category'] || '',
              sizeLabel: row.size || row.size_label || row['Size'] || '',
              priceXaf: parseFloat(row.price || row.price_xaf || row['Price (XAF)'] || '0'),
              quantity: parseInt(row.quantity || row.qty || row['Quantity'] || '0'),
            }));

            setPreviewData(parsedData);
          },
          error: (error: any) => {
            Alert.alert('Error', 'Failed to parse CSV file');
          },
        });
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // Parse Excel file
        const fileUri = file.uri;
        const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
        const workbook = XLSX.read(base64, { type: 'base64' });
        
        // Get all sheet names
        const sheetNames = workbook.SheetNames;
        let allData: any[] = [];
        
        // Process each sheet
        for (const sheetName of sheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length > 0) {
            // Get headers from first row
            const headers = jsonData[0] as string[];
            const dataRows = jsonData.slice(1) as any[][];
            
            // Map data rows to objects
            const sheetData = dataRows.map((row: any[]) => {
              const rowObj: any = {};
              headers.forEach((header: string, index: number) => {
                rowObj[header] = row[index] || '';
              });
              return rowObj;
            });
            
            // Determine parent category based on sheet name
            const parentCategory = sheetName.toLowerCase().includes('pharma') ? 'Pharmaceuticals' : 'Cosmetics';
            
            // Add parent category to each row if not present
            const processedData = sheetData.map(row => ({
              ...row,
              parent_category: row.parent_category || parentCategory
            }));
            
            allData = allData.concat(processedData);
          }
        }
        
        // Parse the combined data
        const parsedData = allData.map((row: any, index: number) => ({
          name: row.name || row.product_name || row['Product Name'] || '',
          parentCategory: row.parent_category || row.parentCategory || row['Parent Category'] || '',
          subcategory: row.subcategory || row.sub_category || row['Subcategory'] || row.category || row.category_name || row['Category'] || '',
          sizeLabel: row.size || row.size_label || row['Size'] || '',
          priceXaf: parseFloat(row.price || row.price_xaf || row['Price (XAF)'] || '0'),
          quantity: parseInt(row.quantity || row.qty || row['Quantity'] || '0'),
        }));

        console.log('Parsed data count:', parsedData.length);
        console.log('First few rows:', parsedData.slice(0, 3));
        setPreviewData(parsedData);
      } else {
        Alert.alert('Error', 'Unsupported file format. Please use CSV or Excel files.');
      }
    } catch (error) {
      console.error('Parse error:', error);
      Alert.alert('Error', 'Failed to parse file. Please check the file format and try again.');
    }
  };

  const handleImport = async () => {
    if (previewData.length === 0) {
      Alert.alert('Error', 'No data to import');
      return;
    }

    setIsProcessing(true);
    try {
      // Simulate a small delay to show the loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const result = bulkImportProducts(previewData);
      onImportComplete(result);
      
      if (result.errors.length > 0) {
        Alert.alert(
          'Import Complete',
          `Successfully imported ${result.success} products. ${result.errors.length} errors occurred.`,
          [
            { text: 'OK', onPress: handleClose },
            { text: 'View Errors', onPress: () => showErrors(result.errors) },
          ]
        );
      } else {
        Alert.alert('Success', `Successfully imported ${result.success} products`, [
          { text: 'OK', onPress: handleClose }
        ]);
      }
    } catch {
      Alert.alert('Error', 'Failed to import products');
    } finally {
      setIsProcessing(false);
    }
  };

  const showErrors = (errors: any[]) => {
    const errorMessage = errors.slice(0, 5).map(e => `Row ${e.row}: ${e.error}`).join('\n');
    Alert.alert('Import Errors', errorMessage);
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewData([]);
    setIsProcessing(false);
    onClose();
  };

  const downloadTemplate = () => {
    const template = 'name,parent_category,subcategory,size,price,quantity\n' +
      'Santex Soap,Cosmetics,Soaps & Body Wash,Large,2100,10\n' +
      'Dettol,Cosmetics,Hygiene & Antiseptics,,1500,5\n' +
      'Body Lotion,Cosmetics,Lotions & Creams,Medium,3000,8\n' +
      'Paracetamol,Pharmaceuticals,Medications,,500,20';
    
    const instructions = 'Template (case-insensitive):\n\n' + template + '\n\nRequired fields:\n• name: Product name\n• parent_category: Must be "Cosmetics" or "Pharmaceuticals"\n• subcategory: Category under parent\n• price: Price in XAF\n• quantity: Stock quantity\n\nNote: Category names are case-insensitive.';
    
    // In a real app, you'd save this to downloads or share it
    Alert.alert('CSV Template', instructions);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ThemedView style={styles.container}>
        {/* Loading Overlay */}
        {isProcessing && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <LoadingSpinner size="lg" color="#3b82f6" />
              <ThemedText style={styles.loadingTitle}>Importing Products</ThemedText>
              <ThemedText style={styles.loadingSubtitle}>
                Please wait while we process your data...
              </ThemedText>
            </View>
          </View>
        )}

        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} disabled={isProcessing}>
            <Ionicons name="close" size={24} color={isProcessing ? "#9ca3af" : "#374151"} />
          </TouchableOpacity>
          <ThemedText type="subtitle">Bulk Import Products</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Instructions */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Instructions</ThemedText>
            <View style={styles.instructionsCard}>
              <ThemedText style={styles.instructionText}>
                1. Download the CSV template or use your own file{'\n'}
                2. Fill in the product data{'\n'}
                3. Upload the file to import products
              </ThemedText>
              <TouchableOpacity style={styles.templateButton} onPress={downloadTemplate}>
                <Ionicons name="download-outline" size={16} color="#3b82f6" />
                <ThemedText style={styles.templateButtonText}>Download Template</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* File Upload */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Upload File</ThemedText>
            <TouchableOpacity style={styles.uploadButton} onPress={handleFilePick}>
              <Ionicons name="cloud-upload-outline" size={24} color="#3b82f6" />
              <ThemedText style={styles.uploadButtonText}>
                {selectedFile ? 'Change File' : 'Select CSV File'}
              </ThemedText>
            </TouchableOpacity>
            {selectedFile && (
              <View style={styles.fileInfo}>
                <Ionicons name="document-text" size={16} color="#6b7280" />
                <ThemedText style={styles.fileName}>{selectedFile.name}</ThemedText>
              </View>
            )}
          </View>

          {/* Preview */}
          {previewData.length > 0 && (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>
                Preview ({previewData.length} products)
              </ThemedText>
              <View style={styles.previewCard}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.previewTable}>
                    <View style={styles.previewHeader}>
                      <ThemedText style={styles.previewHeaderText}>Name</ThemedText>
                      <ThemedText style={styles.previewHeaderText}>Parent</ThemedText>
                      <ThemedText style={styles.previewHeaderText}>Subcategory</ThemedText>
                      <ThemedText style={styles.previewHeaderText}>Size</ThemedText>
                      <ThemedText style={styles.previewHeaderText}>Price</ThemedText>
                      <ThemedText style={styles.previewHeaderText}>Qty</ThemedText>
                    </View>
                    {previewData.slice(0, 10).map((item, index) => (
                      <View key={index} style={styles.previewRow}>
                        <ThemedText style={styles.previewCell}>{item.name}</ThemedText>
                        <ThemedText style={styles.previewCell}>{item.parentCategory}</ThemedText>
                        <ThemedText style={styles.previewCell}>{item.subcategory}</ThemedText>
                        <ThemedText style={styles.previewCell}>{item.sizeLabel || '-'}</ThemedText>
                        <ThemedText style={styles.previewCell}>{item.priceXaf}</ThemedText>
                        <ThemedText style={styles.previewCell}>{item.quantity}</ThemedText>
                      </View>
                    ))}
                    {previewData.length > 10 && (
                      <View style={styles.previewRow}>
                        <ThemedText style={styles.previewCell}>...</ThemedText>
                        <ThemedText style={styles.previewCell}>...</ThemedText>
                        <ThemedText style={styles.previewCell}>...</ThemedText>
                        <ThemedText style={styles.previewCell}>...</ThemedText>
                        <ThemedText style={styles.previewCell}>...</ThemedText>
                        <ThemedText style={styles.previewCell}>...</ThemedText>
                      </View>
                    )}
                  </View>
                </ScrollView>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.importButton, (!selectedFile || isProcessing) && styles.importButtonDisabled]}
            onPress={handleImport}
            disabled={!selectedFile || isProcessing}
          >
            <ThemedText style={[styles.importButtonText, (!selectedFile || isProcessing) && styles.importButtonTextDisabled]}>
              {isProcessing ? 'Importing...' : 'Import Products'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  instructionsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  instructionText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  templateButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#3b82f6',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  fileName: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  previewCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  previewTable: {
    minWidth: 600,
  },
  previewHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  previewHeaderText: {
    flex: 1,
    padding: 12,
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  previewRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  previewCell: {
    flex: 1,
    padding: 12,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  importButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  importButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  importButtonTextDisabled: {
    color: '#9ca3af',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
