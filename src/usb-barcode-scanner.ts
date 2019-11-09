import { HID, Device } from 'node-hid';
import { EventEmitter } from 'events';

import { UsbScannerOptions, HidMap, onDataScanned } from './usb-barcode-scanner-types';
import { getDevice, defaultHidMap, getDeviceByPath } from './usb-barcode-scanner-utils';

export class UsbScanner extends EventEmitter implements onDataScanned {
    hid?: HID;
    hidMap: any;
    bufferOffset: any;

    constructor(options: UsbScannerOptions, hidMap?: any) {
        super();

        let device: Device|undefined;

        if (options.path) {
            device = this.retreiveDeviceByPath(options.path);
        } else if (options.vendorId && options.productId) {
            device = getDevice(options.vendorId, options.productId);
        }

        this.bufferOffset = options.bufferOffset || 2;

        if (device === undefined) {
            console.warn(`Device not found, please provide a valid path or vendor/product combination.`);
        } else {
            this.hid = new HID(device.vendorId, device.productId);

            if (hidMap) {
                this.hidMap = hidMap;
            } else {
                this.hidMap = defaultHidMap();
            }
        }
    }

    private retreiveDevice(vendorId: number, productId: number): Device|undefined {
        return getDevice(vendorId, productId);
    }

    private retreiveDeviceByPath(path: string): Device|undefined {
        return getDeviceByPath(path);
    }

    startScanning(): void {
        let bcodeBuffer: string[] = [];
        let barcode: string = '';

        if (this.hid) {
            this.hid.on('data', (chunk) => {
                if (this.hidMap[chunk[this.bufferOffset]]) {
                    if (chunk[this.bufferOffset] !== 40) {
                        bcodeBuffer.push(this.hidMap[chunk[this.bufferOffset]]);
                    } else {
                        barcode = bcodeBuffer.join("");
                        bcodeBuffer = [];

                        this.emitDataScanned(barcode);
                    }
                }
            });
            let self = this;
            this.hid.on('error', error => {
                if (self.hid) {
                    self.hid.close();
                }
            });
        }
    }

    stopScanning(): void {
        if (this.hid) {
            this.hid.close();
        }
    }

    private emitDataScanned(data: string): void {
        this.emit('data', data)
    }

    private emitError(error: string): void {
        this.emit('error', error);
    }
}