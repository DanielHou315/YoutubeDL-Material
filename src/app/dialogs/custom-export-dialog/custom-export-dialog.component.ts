import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PostsService } from 'app/posts.services';
import { DatabaseFile } from 'api-types';

interface ExportFolder {
  name: string;
  path: string;
  fullPath: string;
  isSymlink: boolean;
}

@Component({
  selector: 'app-custom-export-dialog',
  templateUrl: './custom-export-dialog.component.html',
  styleUrls: ['./custom-export-dialog.component.scss']
})
export class CustomExportDialogComponent implements OnInit {
  file: DatabaseFile;

  // Folder navigation
  folders: ExportFolder[] = [];
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
    this.loadFolders();
  }

  loadFolders(subPath: string = ''): void {
    this.loading = true;
    this.error = '';

    this.postsService.getExportFolders(subPath).subscribe(
      (res: any) => {
        this.loading = false;
        if (res.success) {
          this.folders = res.folders;
          this.currentPath = res.currentPath || '';
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

  navigateToFolder(folder: ExportFolder): void {
    this.pathHistory.push(this.currentPath);
    this.loadFolders(folder.path);
  }

  navigateBack(): void {
    if (this.pathHistory.length > 0) {
      const previousPath = this.pathHistory.pop();
      this.loadFolders(previousPath);
    }
  }

  navigateHome(): void {
    this.pathHistory = [];
    this.loadFolders('');
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
