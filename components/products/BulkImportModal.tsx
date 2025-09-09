import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ImportProductData, bulkImportProducts } from '@/data/productManagementRepo';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Papa from 'papaparse';
import React, { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

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
        type: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        setSelectedFile(file);
        await parseFile(file);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  const parseFile = async (file: any) => {
    try {
      const content = await FileSystem.readAsStringAsync(file.uri);
      
      // Parse CSV content
      Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedData = results.data.map((row: any, index: number) => ({
            name: row.name || row.product_name || row['Product Name'] || '',
            category: row.category || row.category_name || row['Category'] || '',
            sizeLabel: row.size || row.size_label || row['Size'] || '',
            priceXaf: parseFloat(row.price || row.price_xaf || row['Price (XAF)'] || '0'),
            quantity: parseInt(row.quantity || row.qty || row['Quantity'] || '0'),
          }));

          setPreviewData(parsedData);
        },
        error: (error) => {
          Alert.alert('Error', 'Failed to parse CSV file');
        },
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to read file');
    }
  };

  const handleImport = async () => {
    if (previewData.length === 0) {
      Alert.alert('Error', 'No data to import');
      return;
    }

    setIsProcessing(true);
    try {
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
        Alert.alert('Success', `Successfully imported ${result.success} products`);
        handleClose();
      }
    } catch (error) {
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
    const template = 'name,category,size,price,quantity\n' +
      'Santex Soap,Soaps & Body Wash,Large,2100,10\n' +
      'Dettol,Hygiene & Antiseptics,,1500,5\n' +
      'Body Lotion,Lotions & Creams,Medium,3000,8';
    
    // In a real app, you'd save this to downloads or share it
    Alert.alert('Template', 'Copy this CSV format:\n\n' + template);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color="#374151" />
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
                      <ThemedText style={styles.previewHeaderText}>Category</ThemedText>
                      <ThemedText style={styles.previewHeaderText}>Size</ThemedText>
                      <ThemedText style={styles.previewHeaderText}>Price</ThemedText>
                      <ThemedText style={styles.previewHeaderText}>Qty</ThemedText>
                    </View>
                    {previewData.slice(0, 10).map((item, index) => (
                      <View key={index} style={styles.previewRow}>
                        <ThemedText style={styles.previewCell}>{item.name}</ThemedText>
                        <ThemedText style={styles.previewCell}>{item.category}</ThemedText>
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
    minWidth: 500,
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
});
