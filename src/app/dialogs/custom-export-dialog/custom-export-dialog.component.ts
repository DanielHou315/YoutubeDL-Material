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
  namingConvention = 'original';
  customTemplate = '';
  createNewFolder = true;

  // State
  exporting = false;
  exportSuccess = false;
  exportError = '';

  namingConventions = [
    { value: 'original', label: $localize`Original` },
    { value: 'snake_case', label: $localize`Snake Case (my_video_title)` },
    { value: 'kebab_case', label: $localize`Kebab Case (my-video-title)` },
    { value: 'custom', label: $localize`Custom Template` }
  ];

  // Template placeholders (escaped to avoid Angular ICU parsing)
  templatePlaceholder = '{title} - {uploader}';
  templateHint = 'Placeholders: {title}, {uploader}, {channel}, {upload_date}, {id}, {extractor}';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<CustomExportDialogComponent>,
    private postsService: PostsService
  ) {
    this.file = data.file;
  }

  ngOnInit(): void {
    this.loadFolderTree();
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
      namingConvention: this.namingConvention,
      customTemplate: this.namingConvention === 'custom' ? this.customTemplate : '',
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
