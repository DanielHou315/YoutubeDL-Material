import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PostsService } from 'app/posts.services';
import { DatabaseFile } from 'api-types';

interface ExportFolder {
  name: string;
  path: string;
  fullPath: string;
  isSymlink: boolean;
  children: ExportFolder[];
}

@Component({
  selector: 'app-custom-export-dialog',
  templateUrl: './custom-export-dialog.component.html',
  styleUrls: ['./custom-export-dialog.component.scss']
})
export class CustomExportDialogComponent implements OnInit {
  file: DatabaseFile;

  // Folder tree (loaded once)
  folderTree: ExportFolder[] = [];

  // Current navigation state
  currentPath = '';
  pathHistory: string[] = [];
  loading = true;
  error = '';

  // Export options
  includeNfo = true;
  useSimpleFilenames = false;
  createNewFolder = true;

  // Folder naming
  folderName = '';
  namingConvention = 'original';
  isCustomName = false;

  // State
  exporting = false;
  exportSuccess = false;
  exportError = '';

  namingConventions = [
    { value: 'original', label: $localize`Original` },
    { value: 'snake_case', label: $localize`Snake Case` },
    { value: 'kebab_case', label: $localize`Kebab Case` }
  ];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<CustomExportDialogComponent>,
    private postsService: PostsService
  ) {
    this.file = data.file;
  }

  ngOnInit(): void {
    this.loadFolderTree();
    this.folderName = this.generateFolderName('original');
  }

  generateFolderName(convention: string): string {
    const title = this.file.title || 'Untitled';

    // Extract year from upload_date (YYYY-MM-DD or YYYYMMDD format)
    let year = '';
    if (this.file.upload_date) {
      const dateStr = this.file.upload_date.replace(/-/g, '');
      const extracted = dateStr.substring(0, 4);
      if (/^\d{4}$/.test(extracted)) {
        year = extracted;
      }
    }

    // Build Jellyfin-compatible base name: "Title (YYYY)"
    const baseName = year ? `${title} (${year})` : title;

    switch (convention) {
      case 'snake_case':
        return baseName
          .toLowerCase()
          .replace(/[^a-z0-9()]+/g, '_')
          .replace(/^_+|_+$/g, '');
      case 'kebab_case':
        return baseName
          .toLowerCase()
          .replace(/[^a-z0-9()]+/g, '-')
          .replace(/^-+|-+$/g, '');
      case 'original':
      default:
        return baseName;
    }
  }

  onNamingConventionChange(): void {
    this.folderName = this.generateFolderName(this.namingConvention);
    this.isCustomName = false;
  }

  onFolderNameInput(): void {
    // Check if the name differs from all conventions
    const originalName = this.generateFolderName('original');
    const snakeName = this.generateFolderName('snake_case');
    const kebabName = this.generateFolderName('kebab_case');

    if (this.folderName === originalName) {
      this.namingConvention = 'original';
      this.isCustomName = false;
    } else if (this.folderName === snakeName) {
      this.namingConvention = 'snake_case';
      this.isCustomName = false;
    } else if (this.folderName === kebabName) {
      this.namingConvention = 'kebab_case';
      this.isCustomName = false;
    } else {
      this.isCustomName = true;
    }
  }

  loadFolderTree(): void {
    this.loading = true;
    this.error = '';

    this.postsService.getExportFolders(true).subscribe(
      (res: any) => {
        this.loading = false;
        if (res.success) {
          this.folderTree = res.folders;
        } else {
          this.error = res.error || 'Failed to load folders';
        }
      },
      (err) => {
        this.loading = false;
        this.error = 'Failed to connect to server';
        console.error(err);
      }
    );
  }

  // Get folders at current path from cached tree
  get folders(): ExportFolder[] {
    if (!this.currentPath) {
      return this.folderTree;
    }

    // Navigate through the tree to find current folder's children
    const pathParts = this.currentPath.split('/').filter(p => p);
    let current = this.folderTree;

    for (const part of pathParts) {
      const found = current.find(f => f.name === part);
      if (found) {
        current = found.children || [];
      } else {
        return [];
      }
    }

    return current;
  }

  getFullExportPath(): string {
    if (!this.createNewFolder) {
      return this.getCurrentFolderDisplay();
    }
    const base = this.getCurrentFolderDisplay();
    const sep = base === '/' ? '' : '/';
    return `${base}${sep}${this.folderName || '...'}`;
  }

  navigateToFolder(folder: ExportFolder): void {
    this.pathHistory.push(this.currentPath);
    this.currentPath = folder.path;
  }

  navigateBack(): void {
    if (this.pathHistory.length > 0) {
      this.currentPath = this.pathHistory.pop() || '';
    }
  }

  navigateHome(): void {
    this.pathHistory = [];
    this.currentPath = '';
  }

  canNavigateBack(): boolean {
    return this.currentPath !== '';
  }

  getCurrentFolderDisplay(): string {
    if (!this.currentPath) {
      return '/';
    }
    return '/' + this.currentPath;
  }

  exportFile(): void {
    this.exporting = true;
    this.exportError = '';
    this.exportSuccess = false;

    const options = {
      includeNfo: this.includeNfo,
      useSimpleFilenames: this.useSimpleFilenames,
      namingConvention: this.isCustomName ? 'custom' : this.namingConvention,
      customFolderName: this.createNewFolder ? this.folderName : '',
      createNewFolder: this.createNewFolder
    };

    this.postsService.exportFile(this.file.uid, this.currentPath, options).subscribe(
      (res: any) => {
        this.exporting = false;
        if (res.success) {
          this.exportSuccess = true;
          this.postsService.openSnackBar($localize`File exported successfully`);
          setTimeout(() => {
            this.dialogRef.close(true);
          }, 1500);
        } else {
          this.exportError = res.error || 'Export failed';
        }
      },
      (err) => {
        this.exporting = false;
        this.exportError = 'Failed to connect to server';
        console.error(err);
      }
    );
  }
}
