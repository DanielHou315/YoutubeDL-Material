import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PostsService } from 'app/posts.services';
import { Tag } from 'api-types';

@Component({
  selector: 'app-edit-tag-dialog',
  templateUrl: './edit-tag-dialog.component.html',
  styleUrls: ['./edit-tag-dialog.component.scss']
})
export class EditTagDialogComponent implements OnInit {

  updating = false;
  original_tag: Tag = null;
  tag: Tag = null;

  colorOptions = [
    '#2196F3', '#4CAF50', '#FF9800', '#F44336',
    '#9C27B0', '#00BCD4', '#795548', '#607D8B'
  ];

  constructor(@Inject(MAT_DIALOG_DATA) public data: any, private postsService: PostsService) {
    if (this.data) {
      this.original_tag = this.data.tag;
      this.tag = JSON.parse(JSON.stringify(this.original_tag));
    }
  }

  ngOnInit(): void {
  }

  saveClicked() {
    this.updating = true;
    this.postsService.updateTag(this.tag).subscribe(res => {
      this.updating = false;
      this.original_tag = JSON.parse(JSON.stringify(this.tag));
      this.postsService.loadTags();
    }, err => {
      this.updating = false;
      console.error(err);
    });
  }

  tagChanged() {
    return JSON.stringify(this.tag) === JSON.stringify(this.original_tag);
  }
}
