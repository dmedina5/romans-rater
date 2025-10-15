"""
File upload component for Roman's Rater 4.21

Provides PDF file selection and upload functionality.
"""

from pathlib import Path
from typing import Callable, Optional
from nicegui import ui


class FileUploadComponent:
    """Component for PDF file upload and selection."""

    def __init__(self, on_file_selected: Callable[[Path, bool], None]):
        """
        Initialize file upload component.

        Args:
            on_file_selected: Callback function(pdf_path, use_ocr) when file is selected
        """
        self.on_file_selected = on_file_selected
        self.selected_file: Optional[Path] = None
        self.use_ocr = False

    def render(self) -> ui.card:
        """
        Render the file upload component.

        Returns:
            NiceGUI card containing the upload interface
        """
        with ui.card().classes('w-full') as card:
            ui.label('Upload Quote PDF').classes('text-h6')

            with ui.row().classes('w-full items-center gap-4'):
                # File upload
                upload = ui.upload(
                    label='Select PDF',
                    on_upload=self._handle_upload,
                    auto_upload=True,
                ).props('accept=.pdf').classes('flex-grow')

                # OCR checkbox
                self.ocr_checkbox = ui.checkbox(
                    'Use OCR (for image-based PDFs)',
                    value=False,
                    on_change=self._handle_ocr_toggle
                ).classes('flex-shrink-0')

            # File info display
            self.file_info = ui.label('No file selected').classes('text-sm text-gray-600')

            # Process button
            self.process_button = ui.button(
                'Process Quote',
                on_click=self._handle_process,
                color='primary'
            ).props('disabled').classes('mt-4')

            # Status/error display
            self.status_label = ui.label('').classes('text-sm mt-2')

        return card

    def _handle_upload(self, event):
        """Handle file upload event."""
        try:
            # Get uploaded file
            if not event.content:
                return

            # Save to temp location
            temp_dir = Path.home() / '.romans-rater' / 'temp'
            temp_dir.mkdir(parents=True, exist_ok=True)

            self.selected_file = temp_dir / event.name

            # Write file content
            with open(self.selected_file, 'wb') as f:
                f.write(event.content.read())

            # Update UI
            self.file_info.text = f'Selected: {event.name} ({self._format_size(self.selected_file.stat().st_size)})'
            self.file_info.classes('text-sm text-green-600')
            self.process_button.props(remove='disabled')
            self.status_label.text = ''

        except Exception as e:
            self.status_label.text = f'Error uploading file: {e}'
            self.status_label.classes('text-sm text-red-600')

    def _handle_ocr_toggle(self, event):
        """Handle OCR checkbox toggle."""
        self.use_ocr = event.value

    def _handle_process(self):
        """Handle process button click."""
        if not self.selected_file or not self.selected_file.exists():
            self.status_label.text = 'Please select a PDF file first'
            self.status_label.classes('text-sm text-red-600')
            return

        try:
            # Disable button during processing
            self.process_button.props('disabled loading')
            self.status_label.text = 'Processing...'
            self.status_label.classes('text-sm text-blue-600')

            # Call callback
            self.on_file_selected(self.selected_file, self.use_ocr)

        except Exception as e:
            self.status_label.text = f'Error: {e}'
            self.status_label.classes('text-sm text-red-600')
            self.process_button.props(remove='disabled loading')

    def reset(self):
        """Reset the component to initial state."""
        self.selected_file = None
        self.use_ocr = False
        self.ocr_checkbox.value = False
        self.file_info.text = 'No file selected'
        self.file_info.classes('text-sm text-gray-600')
        self.process_button.props('disabled')
        self.process_button.props(remove='loading')
        self.status_label.text = ''

    def show_error(self, message: str):
        """Display an error message."""
        self.status_label.text = message
        self.status_label.classes('text-sm text-red-600')
        self.process_button.props(remove='disabled loading')

    def show_success(self):
        """Display success state."""
        self.status_label.text = 'Processing complete!'
        self.status_label.classes('text-sm text-green-600')
        self.process_button.props(remove='loading')

    @staticmethod
    def _format_size(size_bytes: int) -> str:
        """Format file size in human-readable format."""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} TB"
